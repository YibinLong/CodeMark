/**
 * Error classification and user-friendly message mapping
 */

export enum ErrorType {
  NETWORK = 'network',
  QUOTA_EXCEEDED = 'quota_exceeded',
  AUTHENTICATION = 'authentication',
  VALIDATION = 'validation',
  NOT_FOUND = 'not_found',
  SERVER_ERROR = 'server_error',
  TIMEOUT = 'timeout',
  MONACO_WORKER = 'monaco_worker',
  STORAGE = 'storage',
  UNKNOWN = 'unknown',
}

export interface ClassifiedError {
  type: ErrorType;
  title: string;
  message: string;
  technical?: string;
  recoverable: boolean;
  retryable: boolean;
}

/**
 * Classify an error and return user-friendly messages
 */
export function classifyError(error: Error | unknown): ClassifiedError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorString = errorMessage.toLowerCase();

  // Network errors
  if (
    errorString.includes('network') ||
    errorString.includes('fetch') ||
    errorString.includes('connection') ||
    errorString.includes('offline')
  ) {
    return {
      type: ErrorType.NETWORK,
      title: 'Network Error',
      message: 'Unable to connect to the server. Please check your internet connection and try again.',
      technical: errorMessage,
      recoverable: true,
      retryable: true,
    };
  }

  // Quota/Rate limit errors
  if (
    errorString.includes('quota') ||
    errorString.includes('rate limit') ||
    errorString.includes('429') ||
    errorString.includes('too many requests')
  ) {
    return {
      type: ErrorType.QUOTA_EXCEEDED,
      title: 'Quota Exceeded',
      message: 'You have exceeded your API quota. Please try again later or upgrade your plan.',
      technical: errorMessage,
      recoverable: true,
      retryable: false,
    };
  }

  // Authentication errors
  if (
    errorString.includes('auth') ||
    errorString.includes('unauthorized') ||
    errorString.includes('401') ||
    errorString.includes('403') ||
    errorString.includes('api key') ||
    errorString.includes('invalid key')
  ) {
    return {
      type: ErrorType.AUTHENTICATION,
      title: 'Authentication Error',
      message: 'Authentication failed. Please check your API key in settings and try again.',
      technical: errorMessage,
      recoverable: true,
      retryable: false,
    };
  }

  // Validation errors
  if (
    errorString.includes('validation') ||
    errorString.includes('invalid') ||
    errorString.includes('400')
  ) {
    return {
      type: ErrorType.VALIDATION,
      title: 'Validation Error',
      message: 'The data provided is invalid. Please check your input and try again.',
      technical: errorMessage,
      recoverable: true,
      retryable: false,
    };
  }

  // Not found errors
  if (errorString.includes('not found') || errorString.includes('404')) {
    return {
      type: ErrorType.NOT_FOUND,
      title: 'Not Found',
      message: 'The requested resource was not found.',
      technical: errorMessage,
      recoverable: false,
      retryable: false,
    };
  }

  // Timeout errors
  if (errorString.includes('timeout') || errorString.includes('timed out')) {
    return {
      type: ErrorType.TIMEOUT,
      title: 'Request Timeout',
      message: 'The request took too long to complete. Please try again.',
      technical: errorMessage,
      recoverable: true,
      retryable: true,
    };
  }

  // Monaco Worker errors
  if (
    errorString.includes('monaco') ||
    errorString.includes('worker') ||
    errorString.includes('web worker')
  ) {
    return {
      type: ErrorType.MONACO_WORKER,
      title: 'Editor Loading Error',
      message: 'The code editor failed to load. Using fallback text editor.',
      technical: errorMessage,
      recoverable: true,
      retryable: true,
    };
  }

  // Storage errors
  if (
    errorString.includes('storage') ||
    errorString.includes('localstorage') ||
    errorString.includes('quota')
  ) {
    return {
      type: ErrorType.STORAGE,
      title: 'Storage Error',
      message: 'Unable to save data locally. Your browser storage may be full.',
      technical: errorMessage,
      recoverable: true,
      retryable: false,
    };
  }

  // Server errors (5xx)
  if (
    errorString.includes('500') ||
    errorString.includes('502') ||
    errorString.includes('503') ||
    errorString.includes('504') ||
    errorString.includes('server error')
  ) {
    return {
      type: ErrorType.SERVER_ERROR,
      title: 'Server Error',
      message: 'The server encountered an error. Please try again in a few moments.',
      technical: errorMessage,
      recoverable: true,
      retryable: true,
    };
  }

  // Unknown errors
  return {
    type: ErrorType.UNKNOWN,
    title: 'Unexpected Error',
    message: 'An unexpected error occurred. Please try again.',
    technical: errorMessage,
    recoverable: true,
    retryable: true,
  };
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: Error | unknown): string {
  const classified = classifyError(error);
  return classified.message;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: Error | unknown): boolean {
  const classified = classifyError(error);
  return classified.retryable;
}

/**
 * Check if error is recoverable
 */
export function isRecoverableError(error: Error | unknown): boolean {
  const classified = classifyError(error);
  return classified.recoverable;
}

/**
 * Create a custom error with classification
 */
export class ClassifiableError extends Error {
  public readonly errorType: ErrorType;
  public readonly userMessage: string;
  public readonly recoverable: boolean;
  public readonly retryable: boolean;

  constructor(
    type: ErrorType,
    userMessage: string,
    technicalMessage?: string,
    options?: { recoverable?: boolean; retryable?: boolean }
  ) {
    super(technicalMessage || userMessage);
    this.name = 'ClassifiableError';
    this.errorType = type;
    this.userMessage = userMessage;
    this.recoverable = options?.recoverable ?? true;
    this.retryable = options?.retryable ?? false;
  }
}
