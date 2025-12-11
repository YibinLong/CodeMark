/**
 * Toast notification utility wrapper for sonner
 * Provides consistent toast API across the application
 */

import { toast as sonnerToast, ExternalToast } from 'sonner';

/**
 * Toast duration constants (in milliseconds)
 */
export const TOAST_DURATION = {
  SHORT: 3000,
  MEDIUM: 5000,
  LONG: 7000,
} as const;

/**
 * Success toast notification
 */
export function success(message: string, options?: ExternalToast) {
  return sonnerToast.success(message, {
    duration: TOAST_DURATION.MEDIUM,
    ...options,
  });
}

/**
 * Error toast notification
 */
export function error(message: string, options?: ExternalToast) {
  return sonnerToast.error(message, {
    duration: TOAST_DURATION.LONG,
    ...options,
  });
}

/**
 * Warning toast notification
 */
export function warning(message: string, options?: ExternalToast) {
  return sonnerToast.warning(message, {
    duration: TOAST_DURATION.MEDIUM,
    ...options,
  });
}

/**
 * Info toast notification
 */
export function info(message: string, options?: ExternalToast) {
  return sonnerToast.info(message, {
    duration: TOAST_DURATION.MEDIUM,
    ...options,
  });
}

/**
 * Loading toast notification
 */
export function loading(message: string, options?: ExternalToast) {
  return sonnerToast.loading(message, {
    duration: Infinity,
    ...options,
  });
}

/**
 * Promise-based toast for async operations
 */
export function promise<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: Error) => string);
  },
  options?: ExternalToast
) {
  return sonnerToast.promise(promise, {
    ...messages,
    duration: TOAST_DURATION.MEDIUM,
    ...options,
  });
}

/**
 * Dismiss a specific toast
 */
export function dismiss(toastId?: string | number) {
  return sonnerToast.dismiss(toastId);
}

/**
 * Specialized toast for thread creation
 */
export function threadCreated(threadName: string) {
  return success(`Thread "${threadName}" created successfully`, {
    description: 'You can now start adding code blocks for review',
  });
}

/**
 * Specialized toast for thread deletion
 */
export function threadDeleted(threadName: string, onUndo?: () => void) {
  return success(`Thread "${threadName}" deleted`, {
    description: onUndo ? 'Click undo to restore' : undefined,
    action: onUndo
      ? {
          label: 'Undo',
          onClick: onUndo,
        }
      : undefined,
    duration: TOAST_DURATION.LONG,
  });
}

/**
 * Specialized toast for AI response
 */
export function aiResponseGenerated() {
  return success('AI review generated', {
    description: 'Review the feedback below',
  });
}

/**
 * Specialized toast for AI response error
 */
export function aiResponseError(errorMessage?: string, onRetry?: () => void) {
  return error(errorMessage || 'Failed to generate AI review', {
    description: onRetry ? 'Click retry to try again' : 'Please try again later',
    action: onRetry
      ? {
          label: 'Retry',
          onClick: onRetry,
        }
      : undefined,
  });
}

/**
 * Specialized toast for code block save
 */
export function codeBlockSaved() {
  return success('Code block saved', {
    duration: TOAST_DURATION.SHORT,
  });
}

/**
 * Specialized toast for network errors
 */
export function networkError(onRetry?: () => void) {
  return error('Network error', {
    description: 'Please check your connection and try again',
    action: onRetry
      ? {
          label: 'Retry',
          onClick: onRetry,
        }
      : undefined,
  });
}

/**
 * Specialized toast for quota exceeded
 */
export function quotaExceeded() {
  return error('API quota exceeded', {
    description: 'Please try again later or upgrade your plan',
    duration: TOAST_DURATION.LONG,
  });
}

/**
 * Specialized toast for authentication errors
 */
export function authenticationError() {
  return error('Authentication failed', {
    description: 'Please check your API key and try again',
    duration: TOAST_DURATION.LONG,
  });
}

/**
 * Specialized toast for copy to clipboard
 */
export function copiedToClipboard(content: string = 'Content') {
  return success(`${content} copied to clipboard`, {
    duration: TOAST_DURATION.SHORT,
  });
}

/**
 * Toast notification helpers object for easier imports
 */
export const toast = {
  success,
  error,
  warning,
  info,
  loading,
  promise,
  dismiss,
  // Specialized toasts
  threadCreated,
  threadDeleted,
  aiResponseGenerated,
  aiResponseError,
  codeBlockSaved,
  networkError,
  quotaExceeded,
  authenticationError,
  copiedToClipboard,
};

/**
 * Default export for convenience
 */
export default toast;
