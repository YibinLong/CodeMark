/**
 * Request tracing infrastructure with correlation IDs
 * Enables distributed tracing across client/server boundary
 */

// Correlation ID header name
export const CORRELATION_ID_HEADER = 'x-correlation-id';

// Store for correlation context (server-side only)
let correlationStore: any | null = null;

// Initialize AsyncLocalStorage for server-side (only in Node.js environment)
if (typeof window === 'undefined') {
  try {
    // Dynamic import to avoid bundling async_hooks on client side
    const { AsyncLocalStorage } = require('async_hooks');
    correlationStore = new AsyncLocalStorage();
  } catch (error) {
    console.warn('AsyncLocalStorage not available, correlation IDs will be limited');
  }
}

/**
 * Correlation context stored in AsyncLocalStorage
 */
export interface CorrelationContext {
  correlationId: string;
  startTime: number;
  metadata?: Record<string, any>;
}

/**
 * Generate a unique correlation ID (UUID v4-like)
 */
export function generateCorrelationId(): string {
  // Simple UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get the current correlation ID from AsyncLocalStorage (server-side)
 */
export function getCorrelationId(): string | undefined {
  if (!correlationStore) return undefined;
  return correlationStore.getStore()?.correlationId;
}

/**
 * Get the current correlation context from AsyncLocalStorage (server-side)
 */
export function getCorrelationContext(): CorrelationContext | undefined {
  if (!correlationStore) return undefined;
  return correlationStore.getStore();
}

/**
 * Run a function within a correlation context (server-side)
 */
export async function runWithCorrelation<T>(
  correlationId: string,
  metadata: Record<string, any> = {},
  fn: () => Promise<T>
): Promise<T> {
  if (!correlationStore) {
    // If AsyncLocalStorage is not available, just run the function
    return fn();
  }

  const context: CorrelationContext = {
    correlationId,
    startTime: Date.now(),
    metadata,
  };

  return correlationStore.run(context, fn);
}

/**
 * Client-side correlation ID storage (in-memory)
 */
class ClientCorrelationManager {
  private activeRequests = new Map<string, CorrelationContext>();

  /**
   * Start tracking a request with correlation ID
   */
  startRequest(correlationId: string, metadata?: Record<string, any>): void {
    this.activeRequests.set(correlationId, {
      correlationId,
      startTime: Date.now(),
      metadata,
    });
  }

  /**
   * Complete tracking a request
   */
  completeRequest(correlationId: string): number | undefined {
    const context = this.activeRequests.get(correlationId);
    if (context) {
      const duration = Date.now() - context.startTime;
      this.activeRequests.delete(correlationId);
      return duration;
    }
    return undefined;
  }

  /**
   * Get context for a correlation ID
   */
  getContext(correlationId: string): CorrelationContext | undefined {
    return this.activeRequests.get(correlationId);
  }

  /**
   * Get all active requests
   */
  getActiveRequests(): CorrelationContext[] {
    return Array.from(this.activeRequests.values());
  }
}

/**
 * Global client-side correlation manager
 */
export const clientCorrelationManager =
  typeof window !== 'undefined' ? new ClientCorrelationManager() : null;

/**
 * Create fetch wrapper that adds correlation ID header
 */
export function createTrackedFetch() {
  const originalFetch = typeof window !== 'undefined' ? window.fetch : fetch;

  return async function trackedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    // Generate correlation ID for this request
    const correlationId = generateCorrelationId();

    // Add correlation ID to headers
    const headers = new Headers(init?.headers);
    headers.set(CORRELATION_ID_HEADER, correlationId);

    // Start tracking on client
    if (clientCorrelationManager) {
      clientCorrelationManager.startRequest(correlationId, {
        url: input.toString(),
        method: init?.method || 'GET',
      });
    }

    try {
      // Make the request
      const response = await originalFetch(input, {
        ...init,
        headers,
      });

      // Complete tracking
      if (clientCorrelationManager) {
        const duration = clientCorrelationManager.completeRequest(correlationId);
        if (duration !== undefined && process.env.NODE_ENV === 'development') {
          console.debug(
            `[correlation:${correlationId}] Request completed in ${duration}ms`
          );
        }
      }

      return response;
    } catch (error) {
      // Complete tracking on error
      if (clientCorrelationManager) {
        clientCorrelationManager.completeRequest(correlationId);
      }
      throw error;
    }
  };
}

/**
 * Extract correlation ID from request headers (server-side)
 */
export function extractCorrelationId(headers: Headers): string {
  return headers.get(CORRELATION_ID_HEADER) || generateCorrelationId();
}

/**
 * Middleware helper to wrap API route handlers with correlation context
 */
export function withCorrelation<T>(
  handler: (request: Request) => Promise<T>
): (request: Request) => Promise<T> {
  return async (request: Request) => {
    const correlationId = extractCorrelationId(request.headers);

    // Run handler within correlation context
    if (correlationStore) {
      return runWithCorrelation(
        correlationId,
        {
          url: request.url,
          method: request.method,
        },
        () => handler(request)
      );
    }

    // If AsyncLocalStorage is not available, just run the handler
    return handler(request);
  };
}

/**
 * Get correlation ID for logging (works on both client and server)
 */
export function getCorrelationIdForLogging(): string | undefined {
  // Server-side: get from AsyncLocalStorage
  if (typeof window === 'undefined') {
    return getCorrelationId();
  }

  // Client-side: not applicable (correlation ID is per-request)
  return undefined;
}
