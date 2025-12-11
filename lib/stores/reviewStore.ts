/**
 * Review Store - Zustand store with advanced persistence features
 * Implements thread and selection management with localStorage persistence,
 * error handling, cross-tab sync, and performance optimizations
 */

import { create } from 'zustand';
import { persist, subscribeWithSelector, createJSONStorage } from 'zustand/middleware';
import {
  ThreadStatus,
  MessageRole,
} from '../types/review';
import type {
  Thread,
  Message,
  CodeSelection,
  SerializedThread,
  SerializedMessage,
  SerializedReviewStore,
} from '../types/review';
import {
  getFileFingerprint,
  loadFromStorage,
  saveToStorage,
  setupStorageListener,
  shouldWarnQuota,
  getStorageStats,
  exportData,
  importData,
  STORAGE_VERSION,
} from '../storage';

// ============================================================================
// Store State Interfaces
// ============================================================================

/**
 * State slice for managing threads
 */
interface ThreadsSlice {
  threads: Map<string, Thread>;
  addThread: (thread: Thread) => void;
  updateThread: (threadId: string, updates: Partial<Thread>) => void;
  deleteThread: (threadId: string) => void;
  markThreadResolved: (threadId: string) => void;
  resolveThread: (threadId: string) => void;
  unresolveThread: (threadId: string) => void;
  softDeleteThread: (threadId: string) => void;
  addMessageToThread: (threadId: string, message: Message) => void;
}

/**
 * State slice for managing code selections
 */
interface SelectionsSlice {
  selections: Map<string, CodeSelection>;
  addSelection: (selection: CodeSelection) => void;
  removeSelection: (selectionId: string) => void;
  clearSelections: () => void;
}

/**
 * State slice for UI state management
 */
interface UISlice {
  activeThreadId: string | null;
  composerVisible: boolean;
  setActiveThread: (threadId: string | null) => void;
  setComposerVisible: (visible: boolean) => void;
}

/**
 * Combined store state
 */
export interface ReviewStoreState extends ThreadsSlice, SelectionsSlice, UISlice {}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique ID for threads and messages
 */
const generateId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get storage key with fingerprint
 */
const getStorageKey = async (): Promise<string> => {
  const fingerprint = await getFileFingerprint();
  return `codemark-threads-${fingerprint}`;
};

/**
 * Enhanced storage using new storage utilities
 */
const createEnhancedStorage = () => {
  return createJSONStorage(() => ({
    getItem: async (name: string) => {
      try {
        // Check quota and warn if needed
        const warn = await shouldWarnQuota();
        if (warn) {
          console.warn('Storage quota approaching limit - consider exporting data');
        }

        const data = await loadFromStorage(name);
        if (!data) return null;

        return JSON.stringify(data);
      } catch (error) {
        console.error('Error reading from storage:', error);
        return null;
      }
    },
    setItem: async (name: string, value: string) => {
      try {
        const data: SerializedReviewStore = JSON.parse(value);

        // Get file fingerprint for this storage key
        const fingerprint = await getFileFingerprint();

        // Save with compression for large datasets
        const shouldCompress = value.length > 10000;

        await saveToStorage(name, data, {
          compress: shouldCompress,
          fingerprint,
        });

        // Log storage stats periodically
        if (Math.random() < 0.1) {
          const stats = await getStorageStats();
          console.log('Storage stats:', stats);
        }
      } catch (error) {
        console.error('Error writing to storage:', error);

        // Fallback to basic localStorage if enhanced storage fails
        try {
          localStorage.setItem(name, value);
        } catch (fallbackError) {
          console.error('Fallback storage also failed:', fallbackError);
        }
      }
    },
    removeItem: async (name: string) => {
      try {
        localStorage.removeItem(name);
        localStorage.removeItem(`${name}-compressed`);
      } catch (error) {
        console.error('Error removing from storage:', error);
      }
    },
  }));
};

/**
 * Custom serialization for Date objects and Maps
 */
const serializeState = (state: ReviewStoreState): SerializedReviewStore => {
  const serializedThreads: Record<string, SerializedThread> = {};

  state.threads.forEach((thread, id) => {
    serializedThreads[id] = {
      ...thread,
      createdAt: thread.createdAt.toISOString(),
      updatedAt: thread.updatedAt.toISOString(),
      resolvedAt: thread.resolvedAt?.toISOString(),
      deletedAt: thread.deletedAt?.toISOString(),
      messages: thread.messages.map(msg => ({
        ...msg,
        createdAt: msg.createdAt.toISOString(),
      } as SerializedMessage)),
    };
  });

  const serializedSelections: Record<string, CodeSelection> = {};
  state.selections.forEach((selection, id) => {
    serializedSelections[id] = selection;
  });

  return {
    threads: serializedThreads,
    selections: serializedSelections,
    activeThreadId: state.activeThreadId,
  };
};

/**
 * Custom deserialization for Date objects and Maps
 */
const deserializeState = (serialized: SerializedReviewStore): Partial<ReviewStoreState> => {
  const threads = new Map<string, Thread>();

  Object.entries(serialized.threads || {}).forEach(([id, thread]) => {
    threads.set(id, {
      ...thread,
      createdAt: new Date(thread.createdAt),
      updatedAt: new Date(thread.updatedAt),
      resolvedAt: thread.resolvedAt ? new Date(thread.resolvedAt) : undefined,
      deletedAt: thread.deletedAt ? new Date(thread.deletedAt) : undefined,
      messages: thread.messages.map(msg => ({
        ...msg,
        createdAt: new Date(msg.createdAt),
      })) as Message[],
    });
  });

  const selections = new Map<string, CodeSelection>();
  Object.entries(serialized.selections || {}).forEach(([id, selection]) => {
    selections.set(id, selection);
  });

  return {
    threads,
    selections,
    activeThreadId: serialized.activeThreadId,
  };
};

// ============================================================================
// Cross-tab Synchronization
// ============================================================================

/**
 * Setup enhanced cross-tab synchronization using new storage utilities
 */
const setupEnhancedCrossTabSync = async () => {
  if (typeof window === 'undefined') return () => {};

  const storageKey = await getStorageKey();

  const cleanup = setupStorageListener(storageKey, (data) => {
    if (data) {
      // Trigger Zustand rehydration
      window.dispatchEvent(new Event('storage-sync'));
    }
  });

  return cleanup;
};

// ============================================================================
// Store Creation
// ============================================================================

/**
 * Create the review store with all features:
 * - Thread management (add, update, delete, mark resolved)
 * - Selection tracking (add, remove, clear)
 * - UI state (active thread, composer visibility)
 * - Persistence with localStorage (fallback to sessionStorage)
 * - Custom serialization for Date objects
 * - File fingerprint-based namespacing
 * - subscribeWithSelector for performance
 * - Cross-tab synchronization
 */
export const useReviewStore = create<ReviewStoreState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // ====================================================================
        // Threads Slice
        // ====================================================================
        threads: new Map<string, Thread>(),

        addThread: (thread: Thread) => {
          set((state) => {
            const newThreads = new Map(state.threads);
            newThreads.set(thread.id, thread);
            return { threads: newThreads };
          });
        },

        updateThread: (threadId: string, updates: Partial<Thread>) => {
          set((state) => {
            const thread = state.threads.get(threadId);
            if (!thread) return state;

            const updatedThread = {
              ...thread,
              ...updates,
              updatedAt: new Date(),
            };

            const newThreads = new Map(state.threads);
            newThreads.set(threadId, updatedThread);
            return { threads: newThreads };
          });
        },

        deleteThread: (threadId: string) => {
          set((state) => {
            const newThreads = new Map(state.threads);
            newThreads.delete(threadId);

            return {
              threads: newThreads,
              activeThreadId: state.activeThreadId === threadId ? null : state.activeThreadId,
            };
          });
        },

        markThreadResolved: (threadId: string) => {
          const { updateThread } = get();
          updateThread(threadId, { status: ThreadStatus.RESOLVED });
        },

        resolveThread: (threadId: string) => {
          const { updateThread } = get();
          updateThread(threadId, {
            status: ThreadStatus.RESOLVED,
            resolvedAt: new Date(),
          });
        },

        unresolveThread: (threadId: string) => {
          const { updateThread } = get();
          updateThread(threadId, {
            status: ThreadStatus.OPEN,
            resolvedAt: undefined,
          });
        },

        softDeleteThread: (threadId: string) => {
          const { updateThread } = get();
          updateThread(threadId, {
            deletedAt: new Date(),
          });
        },

        addMessageToThread: (threadId: string, message: Message) => {
          set((state) => {
            const thread = state.threads.get(threadId);
            if (!thread) return state;

            const updatedThread = {
              ...thread,
              messages: [...thread.messages, message],
              updatedAt: new Date(),
            };

            const newThreads = new Map(state.threads);
            newThreads.set(threadId, updatedThread);
            return { threads: newThreads };
          });
        },

        // ====================================================================
        // Selections Slice
        // ====================================================================
        selections: new Map<string, CodeSelection>(),

        addSelection: (selection: CodeSelection) => {
          set((state) => {
            const newSelections = new Map(state.selections);
            newSelections.set(selection.id, selection);
            return { selections: newSelections };
          });
        },

        removeSelection: (selectionId: string) => {
          set((state) => {
            const newSelections = new Map(state.selections);
            newSelections.delete(selectionId);
            return { selections: newSelections };
          });
        },

        clearSelections: () => {
          set({ selections: new Map() });
        },

        // ====================================================================
        // UI Slice
        // ====================================================================
        activeThreadId: null,
        composerVisible: false,

        setActiveThread: (threadId: string | null) => {
          set({ activeThreadId: threadId });
        },

        setComposerVisible: (visible: boolean) => {
          set({ composerVisible: visible });
        },
      }),
      {
        name: `codemark-threads-default`, // Will be updated with fingerprint on first access
        storage: createEnhancedStorage(),

        // Partialize to exclude temporary UI state from persistence
        partialize: (state) => ({
          threads: state.threads,
          selections: state.selections,
          activeThreadId: state.activeThreadId,
          // Exclude composerVisible from persistence
        }),

        // Version for migration support (using version from storage.ts)
        version: STORAGE_VERSION,

        // Migration is now handled by the storage layer
        migrate: (persistedState: unknown, version: number) => {
          // Migrations are handled in storage.ts
          return persistedState as any;
        },

        // Skip hydration on server-side
        skipHydration: typeof window === 'undefined',
      },
    ),
  ),
);

// ============================================================================
// Setup Cross-tab Sync
// ============================================================================

// Initialize enhanced cross-tab synchronization
if (typeof window !== 'undefined') {
  setupEnhancedCrossTabSync().then((cleanup) => {
    // Store cleanup function for potential later use
    (window as any).__reviewStoreCleanup = cleanup;
  });
}

// ============================================================================
// Helper Hooks (Optional - for easier usage)
// ============================================================================

/**
 * Hook to get only threads (optimized with selector)
 */
export const useThreads = () => useReviewStore((state) => state.threads);

/**
 * Hook to get only selections (optimized with selector)
 */
export const useSelections = () => useReviewStore((state) => state.selections);

/**
 * Hook to get only active thread (optimized with selector)
 */
export const useActiveThread = () => {
  const activeThreadId = useReviewStore((state) => state.activeThreadId);
  const threads = useReviewStore((state) => state.threads);
  return activeThreadId ? threads.get(activeThreadId) : null;
};

/**
 * Hook to get thread actions only
 */
export const useThreadActions = () => {
  return useReviewStore((state) => ({
    addThread: state.addThread,
    updateThread: state.updateThread,
    deleteThread: state.deleteThread,
    markThreadResolved: state.markThreadResolved,
    addMessageToThread: state.addMessageToThread,
  }));
};

/**
 * Hook to get selection actions only
 */
export const useSelectionActions = () => {
  return useReviewStore((state) => ({
    addSelection: state.addSelection,
    removeSelection: state.removeSelection,
    clearSelections: state.clearSelections,
  }));
};

/**
 * Hook to get UI actions only
 */
export const useUIActions = () => {
  return useReviewStore((state) => ({
    setActiveThread: state.setActiveThread,
    setComposerVisible: state.setComposerVisible,
  }));
};

// ============================================================================
// Data Export/Import Utilities
// ============================================================================

/**
 * Export current store data to a file
 */
export async function exportStoreData(filename?: string): Promise<void> {
  const state = useReviewStore.getState();
  const serialized = serializeState(state);

  await exportData(serialized, filename);
}

/**
 * Import data from a file and merge with current store
 */
export async function importStoreData(file: File): Promise<void> {
  const imported = await importData(file);

  if (imported) {
    const deserialized = deserializeState(imported);

    // Merge imported data with current state
    useReviewStore.setState(deserialized);
  }
}

/**
 * Get current storage statistics
 */
export async function getStoreStats() {
  return getStorageStats();
}
