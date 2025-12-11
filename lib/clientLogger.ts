/**
 * Client-side logging infrastructure for browser environments
 * Provides localStorage-based log persistence with circular buffer and filtering
 */

'use client';

// Log levels for client-side logging
export type ClientLogLevel = 'debug' | 'info' | 'warn' | 'error';

// Available namespaces for different client modules
export type ClientLogNamespace =
  | 'ui'
  | 'editor'
  | 'thread'
  | 'review'
  | 'storage'
  | 'ai'
  | 'network'
  | 'general';

// Log entry structure
export interface LogEntry {
  id: string;
  timestamp: string;
  namespace: ClientLogNamespace;
  level: ClientLogLevel;
  message: string;
  args: any[];
}

// Storage key for logs
const STORAGE_KEY = 'codemark_client_logs';
const MAX_LOG_ENTRIES = 1000;

/**
 * Client-side logger with localStorage persistence
 */
export class ClientLogger {
  private namespace: ClientLogNamespace;
  private enabled: boolean;
  private logBuffer: LogEntry[] = [];

  constructor(namespace: ClientLogNamespace) {
    this.namespace = namespace;
    this.enabled = typeof window !== 'undefined';

    // Load existing logs from localStorage on initialization
    if (this.enabled) {
      this.loadLogs();
    }
  }

  /**
   * Log debug-level message
   */
  debug(message: string, ...args: any[]): void {
    this.log('debug', message, ...args);
    if (this.shouldLog('debug')) {
      console.debug(`[${this.namespace}:debug]`, message, ...args);
    }
  }

  /**
   * Log info-level message
   */
  info(message: string, ...args: any[]): void {
    this.log('info', message, ...args);
    if (this.shouldLog('info')) {
      console.info(`[${this.namespace}:info]`, message, ...args);
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, ...args: any[]): void {
    this.log('warn', message, ...args);
    if (this.shouldLog('warn')) {
      console.warn(`[${this.namespace}:warn]`, message, ...args);
    }
  }

  /**
   * Log error message
   */
  error(message: string, ...args: any[]): void {
    this.log('error', message, ...args);
    if (this.shouldLog('error')) {
      console.error(`[${this.namespace}:error]`, message, ...args);
    }
  }

  /**
   * Internal log method that persists to storage
   */
  private log(level: ClientLogLevel, message: string, ...args: any[]): void {
    if (!this.enabled) return;

    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      namespace: this.namespace,
      level,
      message,
      args: this.serializeArgs(args),
    };

    // Add to buffer
    this.logBuffer.push(entry);

    // Maintain circular buffer by removing old entries
    if (this.logBuffer.length > MAX_LOG_ENTRIES) {
      this.logBuffer = this.logBuffer.slice(-MAX_LOG_ENTRIES);
    }

    // Persist to localStorage
    this.saveLogs();
  }

  /**
   * Load logs from localStorage
   */
  private loadLogs(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.logBuffer = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load logs from localStorage:', error);
      this.logBuffer = [];
    }
  }

  /**
   * Save logs to localStorage with quota error handling
   */
  private saveLogs(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logBuffer));
    } catch (error) {
      // Handle quota exceeded errors
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, clearing old logs');
        // Remove oldest 50% of logs
        this.logBuffer = this.logBuffer.slice(-Math.floor(MAX_LOG_ENTRIES / 2));
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logBuffer));
        } catch (retryError) {
          console.error('Failed to save logs even after cleanup:', retryError);
          // Clear all logs as last resort
          this.logBuffer = [];
          localStorage.removeItem(STORAGE_KEY);
        }
      } else {
        console.error('Failed to save logs to localStorage:', error);
      }
    }
  }

  /**
   * Serialize arguments for storage
   */
  private serializeArgs(args: any[]): any[] {
    return args.map(arg => {
      if (arg instanceof Error) {
        return {
          name: arg.name,
          message: arg.message,
          stack: arg.stack,
        };
      }
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.parse(JSON.stringify(arg));
        } catch {
          return String(arg);
        }
      }
      return arg;
    });
  }

  /**
   * Generate unique ID for log entry
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if log level should be displayed based on environment
   */
  private shouldLog(level: ClientLogLevel): boolean {
    // In development, log everything
    if (process.env.NODE_ENV === 'development') {
      return true;
    }

    // In production, only log warnings and errors
    return level === 'warn' || level === 'error';
  }

  /**
   * Get all logs
   */
  static getAllLogs(): LogEntry[] {
    if (typeof window === 'undefined') return [];

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get logs:', error);
      return [];
    }
  }

  /**
   * Get logs filtered by namespace
   */
  static getLogsByNamespace(namespace: ClientLogNamespace): LogEntry[] {
    return this.getAllLogs().filter(log => log.namespace === namespace);
  }

  /**
   * Get logs filtered by level
   */
  static getLogsByLevel(level: ClientLogLevel): LogEntry[] {
    return this.getAllLogs().filter(log => log.level === level);
  }

  /**
   * Get logs filtered by time range
   */
  static getLogsByTimeRange(startTime: Date, endTime: Date): LogEntry[] {
    return this.getAllLogs().filter(log => {
      const logTime = new Date(log.timestamp);
      return logTime >= startTime && logTime <= endTime;
    });
  }

  /**
   * Export logs as JSON string
   */
  static exportLogsAsJSON(): string {
    const logs = this.getAllLogs();
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Export logs as text format
   */
  static exportLogsAsText(): string {
    const logs = this.getAllLogs();
    return logs
      .map(log => {
        const argsStr = log.args.length > 0 ? ` ${JSON.stringify(log.args)}` : '';
        return `[${log.timestamp}] [${log.namespace}:${log.level}] ${log.message}${argsStr}`;
      })
      .join('\n');
  }

  /**
   * Clear all logs
   */
  static clearLogs(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(STORAGE_KEY);
      console.info('Client logs cleared');
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }

  /**
   * Get log statistics
   */
  static getLogStats(): {
    total: number;
    byLevel: Record<ClientLogLevel, number>;
    byNamespace: Record<ClientLogNamespace, number>;
    oldestTimestamp: string | null;
    newestTimestamp: string | null;
  } {
    const logs = this.getAllLogs();

    const stats = {
      total: logs.length,
      byLevel: {
        debug: 0,
        info: 0,
        warn: 0,
        error: 0,
      } as Record<ClientLogLevel, number>,
      byNamespace: {} as Record<ClientLogNamespace, number>,
      oldestTimestamp: logs.length > 0 ? logs[0].timestamp : null,
      newestTimestamp: logs.length > 0 ? logs[logs.length - 1].timestamp : null,
    };

    logs.forEach(log => {
      stats.byLevel[log.level]++;
      stats.byNamespace[log.namespace] = (stats.byNamespace[log.namespace] || 0) + 1;
    });

    return stats;
  }
}

/**
 * Create a client logger instance for a specific namespace
 */
export function createClientLogger(namespace: ClientLogNamespace): ClientLogger {
  return new ClientLogger(namespace);
}

/**
 * Pre-configured client loggers for common namespaces
 */
export const clientLoggers = {
  ui: createClientLogger('ui'),
  editor: createClientLogger('editor'),
  thread: createClientLogger('thread'),
  review: createClientLogger('review'),
  storage: createClientLogger('storage'),
  ai: createClientLogger('ai'),
  network: createClientLogger('network'),
  general: createClientLogger('general'),
};

/**
 * Default client logger for general use
 */
export const clientLogger = createClientLogger('general');
