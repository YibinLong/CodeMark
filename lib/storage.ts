/**
 * Storage Management System
 * Provides versioned localStorage with migrations, quota management, compression, and cross-tab sync
 */

import type {
  SerializedReviewStore,
  SerializedThread,
  CodeSelection,
} from './types/review';

// ============================================================================
// Constants and Configuration
// ============================================================================

export const STORAGE_VERSION = 2;
export const STORAGE_KEY_PREFIX = 'codemark';
export const STORAGE_SCHEMA_VERSION_KEY = `${STORAGE_KEY_PREFIX}-schema-version`;
export const CLEANUP_AGE_DAYS = 30;
export const QUOTA_WARNING_THRESHOLD = 0.8; // 80% of quota

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Storage schema with versioning
 */
export interface StorageSchema {
  version: number;
  data: SerializedReviewStore;
  metadata: StorageMetadata;
}

/**
 * Storage metadata for tracking and management
 */
export interface StorageMetadata {
  createdAt: string;
  updatedAt: string;
  lastCleanup?: string;
  compressionEnabled: boolean;
  fileFingerprint?: string;
}

/**
 * Migration function type
 */
export type MigrationFunction = (
  oldData: any,
  oldVersion: number,
) => Promise<any>;

/**
 * Storage quota information
 */
export interface StorageQuota {
  usage: number;
  quota: number;
  percentUsed: number;
  available: number;
}

/**
 * Export data format
 */
export interface ExportData {
  version: number;
  exportedAt: string;
  schema: StorageSchema;
  checksum: string;
}

// ============================================================================
// File Fingerprinting with crypto.subtle
// ============================================================================

/**
 * Generate SHA-256 hash for content-based storage keys
 */
export async function generateContentHash(content: string): Promise<string> {
  try {
    // Use crypto.subtle for SHA-256 hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    // Convert buffer to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
  } catch (error) {
    console.error('Failed to generate content hash:', error);
    // Fallback to simple hash if crypto.subtle fails
    return fallbackHash(content);
  }
}

/**
 * Fallback hash function when crypto.subtle is unavailable
 */
function fallbackHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Get file fingerprint using crypto.subtle
 */
export async function getFileFingerprint(filePath?: string): Promise<string> {
  const path = filePath || (typeof window !== 'undefined' ? window.location.pathname : 'default');
  return generateContentHash(path);
}

// ============================================================================
// Data Compression
// ============================================================================

/**
 * Compress data using CompressionStream API
 */
export async function compressData(data: string): Promise<Blob> {
  try {
    // Check if CompressionStream is available
    if (typeof CompressionStream === 'undefined') {
      // Return uncompressed data as blob
      return new Blob([data], { type: 'application/json' });
    }

    const blob = new Blob([data]);
    const stream = blob.stream();
    const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));

    return new Response(compressedStream).blob();
  } catch (error) {
    console.error('Compression failed:', error);
    // Return uncompressed data on error
    return new Blob([data], { type: 'application/json' });
  }
}

/**
 * Decompress data using DecompressionStream API
 */
export async function decompressData(blob: Blob): Promise<string> {
  try {
    // Check if blob is compressed (gzip type)
    if (blob.type === 'application/json') {
      // Uncompressed data
      return blob.text();
    }

    if (typeof DecompressionStream === 'undefined') {
      // Try to read as text if DecompressionStream unavailable
      return blob.text();
    }

    const stream = blob.stream();
    const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));

    return new Response(decompressedStream).text();
  } catch (error) {
    console.error('Decompression failed:', error);
    // Try to read as plain text on error
    return blob.text();
  }
}

// ============================================================================
// Storage Quota Management
// ============================================================================

/**
 * Get storage quota information
 */
export async function getStorageQuota(): Promise<StorageQuota | null> {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;

      return {
        usage,
        quota,
        percentUsed: quota > 0 ? usage / quota : 0,
        available: quota - usage,
      };
    }
  } catch (error) {
    console.error('Failed to get storage quota:', error);
  }

  return null;
}

/**
 * Check if storage quota warning should be shown
 */
export async function shouldWarnQuota(): Promise<boolean> {
  const quota = await getStorageQuota();
  return quota ? quota.percentUsed >= QUOTA_WARNING_THRESHOLD : false;
}

/**
 * Calculate storage size for a key
 */
export function getStorageSize(key: string): number {
  try {
    const item = localStorage.getItem(key);
    if (!item) return 0;

    // Approximate size in bytes (UTF-16 encoding)
    return item.length * 2;
  } catch (error) {
    console.error('Failed to get storage size:', error);
    return 0;
  }
}

/**
 * Get total size of all CodeMark storage
 */
export function getTotalStorageSize(): number {
  try {
    let total = 0;
    const keys = Object.keys(localStorage);

    for (const key of keys) {
      if (key.startsWith(STORAGE_KEY_PREFIX)) {
        total += getStorageSize(key);
      }
    }

    return total;
  } catch (error) {
    console.error('Failed to calculate total storage size:', error);
    return 0;
  }
}

// ============================================================================
// Data Cleanup
// ============================================================================

/**
 * Clean up threads older than specified days
 */
export function cleanupOldThreads(
  data: SerializedReviewStore,
  maxAgeDays: number = CLEANUP_AGE_DAYS
): SerializedReviewStore {
  const now = new Date();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

  const cleanedThreads: Record<string, SerializedThread> = {};
  let removedCount = 0;

  Object.entries(data.threads || {}).forEach(([id, thread]) => {
    const threadDate = new Date(thread.updatedAt || thread.createdAt);
    const age = now.getTime() - threadDate.getTime();

    // Keep thread if it's not too old or if it's not deleted
    if (age < maxAgeMs || !thread.deletedAt) {
      cleanedThreads[id] = thread;
    } else {
      removedCount++;
    }
  });

  if (removedCount > 0) {
    console.log(`Cleaned up ${removedCount} old threads`);
  }

  return {
    ...data,
    threads: cleanedThreads,
  };
}

/**
 * Remove orphaned selections (selections without associated threads)
 */
export function cleanupOrphanedSelections(
  data: SerializedReviewStore
): SerializedReviewStore {
  const threadSelectionIds = new Set(
    Object.values(data.threads || {}).map(t => t.selectionId)
  );

  const cleanedSelections: Record<string, CodeSelection> = {};
  let removedCount = 0;

  Object.entries(data.selections || {}).forEach(([id, selection]) => {
    if (threadSelectionIds.has(id)) {
      cleanedSelections[id] = selection;
    } else {
      removedCount++;
    }
  });

  if (removedCount > 0) {
    console.log(`Cleaned up ${removedCount} orphaned selections`);
  }

  return {
    ...data,
    selections: cleanedSelections,
  };
}

/**
 * Perform full data cleanup
 */
export function performCleanup(data: SerializedReviewStore): SerializedReviewStore {
  let cleaned = cleanupOldThreads(data);
  cleaned = cleanupOrphanedSelections(cleaned);
  return cleaned;
}

// ============================================================================
// Migration System
// ============================================================================

/**
 * Migration registry mapping versions to migration functions
 */
const migrations: Map<number, MigrationFunction> = new Map();

/**
 * Register a migration function for a specific version
 */
export function registerMigration(
  toVersion: number,
  migrationFn: MigrationFunction
): void {
  migrations.set(toVersion, migrationFn);
}

/**
 * Run migrations from old version to current version
 */
export async function runMigrations(
  data: any,
  fromVersion: number,
  toVersion: number
): Promise<any> {
  let currentData = data;
  let currentVersion = fromVersion;

  console.log(`Running migrations from v${fromVersion} to v${toVersion}`);

  // Create backup before migration
  const backup = JSON.stringify(currentData);
  sessionStorage.setItem(`${STORAGE_KEY_PREFIX}-migration-backup`, backup);

  try {
    // Run migrations sequentially
    for (let v = fromVersion + 1; v <= toVersion; v++) {
      const migrationFn = migrations.get(v);

      if (migrationFn) {
        console.log(`Applying migration to v${v}...`);
        currentData = await migrationFn(currentData, currentVersion);
        currentVersion = v;
      }
    }

    console.log(`Migration completed successfully to v${toVersion}`);

    // Clear backup after successful migration
    sessionStorage.removeItem(`${STORAGE_KEY_PREFIX}-migration-backup`);

    return currentData;
  } catch (error) {
    console.error('Migration failed:', error);

    // Attempt to restore from backup
    console.log('Attempting to restore from backup...');
    try {
      const restoredData = JSON.parse(backup);
      console.log('Successfully restored from backup');
      return restoredData;
    } catch (restoreError) {
      console.error('Failed to restore from backup:', restoreError);
      throw new Error('Migration failed and backup restoration failed');
    }
  }
}

/**
 * Migration from v1 to v2: Add metadata fields
 */
registerMigration(2, async (data: any, oldVersion: number) => {
  // Add metadata if not present
  if (!data.metadata) {
    data.metadata = {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      compressionEnabled: false,
    };
  }

  // Ensure all threads have required fields
  if (data.data && data.data.threads) {
    Object.values(data.data.threads).forEach((thread: any) => {
      if (!thread.updatedAt && thread.createdAt) {
        thread.updatedAt = thread.createdAt;
      }
    });
  }

  return data;
});

// ============================================================================
// Versioned Storage Operations
// ============================================================================

/**
 * Save data to versioned storage
 */
export async function saveToStorage(
  key: string,
  data: SerializedReviewStore,
  options: { compress?: boolean; fingerprint?: string } = {}
): Promise<void> {
  try {
    const schema: StorageSchema = {
      version: STORAGE_VERSION,
      data,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        compressionEnabled: options.compress || false,
        fileFingerprint: options.fingerprint,
      },
    };

    const serialized = JSON.stringify(schema);

    // Check if we should compress
    if (options.compress && serialized.length > 10000) {
      const compressed = await compressData(serialized);
      const reader = new FileReader();

      return new Promise((resolve, reject) => {
        reader.onload = () => {
          try {
            const base64 = reader.result as string;
            localStorage.setItem(key, base64);
            localStorage.setItem(`${key}-compressed`, 'true');
            resolve();
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(compressed);
      });
    } else {
      localStorage.setItem(key, serialized);
      localStorage.removeItem(`${key}-compressed`);
    }

    // Update schema version
    localStorage.setItem(STORAGE_SCHEMA_VERSION_KEY, STORAGE_VERSION.toString());
  } catch (error) {
    console.error('Failed to save to storage:', error);
    throw error;
  }
}

/**
 * Load data from versioned storage with migration support
 */
export async function loadFromStorage(
  key: string
): Promise<SerializedReviewStore | null> {
  try {
    const isCompressed = localStorage.getItem(`${key}-compressed`) === 'true';
    let serialized = localStorage.getItem(key);

    if (!serialized) {
      return null;
    }

    // Decompress if needed
    if (isCompressed) {
      // Convert base64 back to blob
      const response = await fetch(serialized);
      const blob = await response.blob();
      serialized = await decompressData(blob);
    }

    const schema: StorageSchema = JSON.parse(serialized);

    // Check version and run migrations if needed
    if (schema.version < STORAGE_VERSION) {
      console.log(`Storage version mismatch: v${schema.version} -> v${STORAGE_VERSION}`);
      const migrated = await runMigrations(schema, schema.version, STORAGE_VERSION);

      // Save migrated data
      await saveToStorage(key, migrated.data, {
        compress: migrated.metadata?.compressionEnabled,
        fingerprint: migrated.metadata?.fileFingerprint,
      });

      return migrated.data;
    }

    // Perform cleanup on load
    const cleaned = performCleanup(schema.data);

    // If cleanup removed items, save cleaned version
    if (JSON.stringify(cleaned) !== JSON.stringify(schema.data)) {
      schema.data = cleaned;
      schema.metadata.lastCleanup = new Date().toISOString();
      schema.metadata.updatedAt = new Date().toISOString();

      await saveToStorage(key, schema.data, {
        compress: schema.metadata.compressionEnabled,
        fingerprint: schema.metadata.fileFingerprint,
      });
    }

    return schema.data;
  } catch (error) {
    console.error('Failed to load from storage:', error);
    return null;
  }
}

// ============================================================================
// Export/Import Functionality
// ============================================================================

/**
 * Generate checksum for data integrity
 */
async function generateChecksum(data: string): Promise<string> {
  return generateContentHash(data);
}

/**
 * Export data to file
 */
export async function exportData(
  data: SerializedReviewStore,
  filename: string = 'codemark-export.json'
): Promise<void> {
  try {
    const schema: StorageSchema = {
      version: STORAGE_VERSION,
      data,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        compressionEnabled: false,
      },
    };

    const serialized = JSON.stringify(schema, null, 2);
    const checksum = await generateChecksum(serialized);

    const exportData: ExportData = {
      version: STORAGE_VERSION,
      exportedAt: new Date().toISOString(),
      schema,
      checksum,
    };

    const exportJson = JSON.stringify(exportData, null, 2);
    const blob = new Blob([exportJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);

    console.log('Data exported successfully');
  } catch (error) {
    console.error('Failed to export data:', error);
    throw error;
  }
}

/**
 * Import data from file
 */
export async function importData(file: File): Promise<SerializedReviewStore> {
  try {
    const text = await file.text();
    const exportData: ExportData = JSON.parse(text);

    // Verify checksum
    const schemaJson = JSON.stringify(exportData.schema, null, 2);
    const checksum = await generateChecksum(schemaJson);

    if (checksum !== exportData.checksum) {
      throw new Error('Checksum verification failed - data may be corrupted');
    }

    // Run migrations if needed
    let data = exportData.schema.data;

    if (exportData.version < STORAGE_VERSION) {
      const migrated = await runMigrations(
        exportData.schema,
        exportData.version,
        STORAGE_VERSION
      );
      data = migrated.data;
    }

    console.log('Data imported successfully');
    return data;
  } catch (error) {
    console.error('Failed to import data:', error);
    throw error;
  }
}

/**
 * Import data from JSON string
 */
export async function importDataFromString(
  jsonString: string
): Promise<SerializedReviewStore> {
  const blob = new Blob([jsonString], { type: 'application/json' });
  const file = new File([blob], 'import.json', { type: 'application/json' });
  return importData(file);
}

// ============================================================================
// Storage Event Handling for Cross-tab Sync
// ============================================================================

export type StorageEventCallback = (data: SerializedReviewStore | null) => void;

/**
 * Setup storage event listener for cross-tab synchronization
 */
export function setupStorageListener(
  key: string,
  callback: StorageEventCallback
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleStorageEvent = async (event: StorageEvent) => {
    if (event.key === key && event.newValue) {
      try {
        const data = await loadFromStorage(key);
        callback(data);
      } catch (error) {
        console.error('Error handling storage event:', error);
      }
    } else if (event.key === key && !event.newValue) {
      // Storage was cleared
      callback(null);
    }
  };

  window.addEventListener('storage', handleStorageEvent);

  // Return cleanup function
  return () => {
    window.removeEventListener('storage', handleStorageEvent);
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Clear all CodeMark storage
 */
export function clearAllStorage(): void {
  try {
    const keys = Object.keys(localStorage);
    const codemarkKeys = keys.filter(k => k.startsWith(STORAGE_KEY_PREFIX));

    codemarkKeys.forEach(key => {
      localStorage.removeItem(key);
    });

    console.log(`Cleared ${codemarkKeys.length} storage items`);
  } catch (error) {
    console.error('Failed to clear storage:', error);
  }
}

/**
 * Get storage statistics
 */
export async function getStorageStats(): Promise<{
  totalSize: number;
  quota: StorageQuota | null;
  itemCount: number;
  oldestItem: string | null;
  newestItem: string | null;
}> {
  const totalSize = getTotalStorageSize();
  const quota = await getStorageQuota();

  const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_KEY_PREFIX));

  return {
    totalSize,
    quota,
    itemCount: keys.length,
    oldestItem: keys.length > 0 ? keys[0] : null,
    newestItem: keys.length > 0 ? keys[keys.length - 1] : null,
  };
}
