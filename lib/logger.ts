/**
 * Server-side logging infrastructure using debug package
 * Provides namespace-based logging with different log levels
 */

import debug from 'debug';
import { getCorrelationId } from './correlation';

// Log levels mapped to debug namespaces
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Available namespaces for different modules
export type LogNamespace =
  | 'api'
  | 'store'
  | 'ai'
  | 'auth'
  | 'storage'
  | 'thread'
  | 'review'
  | 'editor'
  | 'general';

/**
 * Logger instance with namespace and level support
 */
export class Logger {
  private debuggers: Record<LogLevel, debug.Debugger>;
  private namespace: string;

  constructor(namespace: LogNamespace) {
    this.namespace = namespace;

    // Create separate debuggers for each log level
    this.debuggers = {
      debug: debug(`codemark:${namespace}:debug`),
      info: debug(`codemark:${namespace}:info`),
      warn: debug(`codemark:${namespace}:warn`),
      error: debug(`codemark:${namespace}:error`),
    };

    // Enable colors for better readability
    if (process.env.DEBUG === undefined) {
      debug.enable('codemark:*:info,codemark:*:warn,codemark:*:error');
    }
  }

  /**
   * Log debug-level message
   */
  debug(message: string, ...args: any[]): void {
    this.debuggers.debug(this.formatMessage(message), ...this.sanitizeArgs(args));
  }

  /**
   * Log info-level message
   */
  info(message: string, ...args: any[]): void {
    this.debuggers.info(this.formatMessage(message), ...this.sanitizeArgs(args));
  }

  /**
   * Log warning message
   */
  warn(message: string, ...args: any[]): void {
    this.debuggers.warn(this.formatMessage(message), ...this.sanitizeArgs(args));
  }

  /**
   * Log error message with optional error object
   */
  error(message: string, error?: Error | unknown, ...args: any[]): void {
    const errorDetails = this.formatError(error);
    this.debuggers.error(
      this.formatMessage(message),
      errorDetails,
      ...this.sanitizeArgs(args)
    );
  }

  /**
   * Log structured data with context
   */
  logWithContext(level: LogLevel, message: string, context: Record<string, any>): void {
    this.debuggers[level](
      this.formatMessage(message),
      this.sanitizeContext(context)
    );
  }

  /**
   * Format message with timestamp and correlation ID
   */
  private formatMessage(message: string): string {
    const correlationId = getCorrelationId();
    const correlationPrefix = correlationId ? `[cid:${correlationId.slice(0, 8)}]` : '';

    if (process.env.NODE_ENV === 'development') {
      return `[${new Date().toISOString()}]${correlationPrefix} ${message}`;
    }
    return `${correlationPrefix} ${message}`.trim();
  }

  /**
   * Format error object for logging with stack trace and correlation ID
   */
  private formatError(error: Error | unknown): string {
    const correlationId = getCorrelationId();
    const correlationInfo = correlationId ? `\nCorrelation ID: ${correlationId}` : '';

    if (error instanceof Error) {
      return `${error.name}: ${error.message}\nStack: ${error.stack || 'No stack trace'}${correlationInfo}`;
    }
    return `${String(error)}${correlationInfo}`;
  }

  /**
   * Sanitize arguments to remove sensitive information in production
   */
  private sanitizeArgs(args: any[]): any[] {
    if (process.env.NODE_ENV === 'production') {
      return args.map(arg => this.sanitizeValue(arg));
    }
    return args;
  }

  /**
   * Sanitize context object to remove sensitive data
   */
  private sanitizeContext(context: Record<string, any>): Record<string, any> {
    if (process.env.NODE_ENV === 'production') {
      const sanitized: Record<string, any> = {};
      for (const [key, value] of Object.entries(context)) {
        sanitized[key] = this.sanitizeValue(value);
      }
      return sanitized;
    }
    return context;
  }

  /**
   * Sanitize individual values - remove API keys, tokens, passwords
   */
  private sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      // Redact potential sensitive data
      const sensitivePatterns = [
        /api[_-]?key/i,
        /token/i,
        /password/i,
        /secret/i,
        /auth/i,
      ];

      for (const pattern of sensitivePatterns) {
        if (pattern.test(value)) {
          return '[REDACTED]';
        }
      }
      return value;
    }

    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return value.map(v => this.sanitizeValue(v));
      }

      const sanitized: Record<string, any> = {};
      for (const [key, val] of Object.entries(value)) {
        // Redact sensitive keys
        if (/api[_-]?key|token|password|secret|auth/i.test(key)) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeValue(val);
        }
      }
      return sanitized;
    }

    return value;
  }
}

/**
 * Create a logger instance for a specific namespace
 */
export function createLogger(namespace: LogNamespace): Logger {
  return new Logger(namespace);
}

/**
 * Pre-configured loggers for common namespaces
 */
export const loggers = {
  api: createLogger('api'),
  store: createLogger('store'),
  ai: createLogger('ai'),
  auth: createLogger('auth'),
  storage: createLogger('storage'),
  thread: createLogger('thread'),
  review: createLogger('review'),
  editor: createLogger('editor'),
  general: createLogger('general'),
};

/**
 * Default logger for general use
 */
export const logger = createLogger('general');
