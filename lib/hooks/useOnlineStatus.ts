'use client';

/**
 * Hook for monitoring connection status and network quality
 */

import { useState, useEffect } from 'react';
import { toast } from '@/lib/toast';

export interface OnlineStatus {
  isOnline: boolean;
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  downlink?: number; // Mb/s
  rtt?: number; // Round-trip time in ms
  saveData?: boolean;
}

/**
 * Hook to monitor online/offline status and network quality
 */
export function useOnlineStatus(options?: {
  showToasts?: boolean;
  onOnline?: () => void;
  onOffline?: () => void;
}): OnlineStatus {
  const { showToasts = true, onOnline, onOffline } = options || {};

  const [status, setStatus] = useState<OnlineStatus>(() => {
    if (typeof window === 'undefined') {
      return { isOnline: true };
    }

    return {
      isOnline: navigator.onLine,
      ...getNetworkInfo(),
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let wasOnline = navigator.onLine;

    const handleOnline = () => {
      setStatus((prev) => ({ ...prev, isOnline: true, ...getNetworkInfo() }));

      if (!wasOnline) {
        if (showToasts) {
          toast.success('Back online', {
            description: 'Your connection has been restored',
          });
        }
        onOnline?.();
      }

      wasOnline = true;
    };

    const handleOffline = () => {
      setStatus((prev) => ({ ...prev, isOnline: false }));

      if (wasOnline) {
        if (showToasts) {
          toast.error('No internet connection', {
            description: 'Some features may be unavailable',
            duration: 5000,
          });
        }
        onOffline?.();
      }

      wasOnline = false;
    };

    const handleConnectionChange = () => {
      setStatus((prev) => ({
        ...prev,
        isOnline: navigator.onLine,
        ...getNetworkInfo(),
      }));
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen to connection changes if Network Information API is available
    const connection = getConnection();
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, [showToasts, onOnline, onOffline]);

  return status;
}

/**
 * Get network connection information using Network Information API
 */
function getNetworkInfo(): Partial<OnlineStatus> {
  const connection = getConnection();

  if (!connection) {
    return {};
  }

  return {
    effectiveType: connection.effectiveType as OnlineStatus['effectiveType'],
    downlink: connection.downlink,
    rtt: connection.rtt,
    saveData: connection.saveData,
  };
}

/**
 * Get the network connection object with proper typing
 */
function getConnection(): any | undefined {
  if (typeof navigator === 'undefined') return undefined;

  return (
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection
  );
}

/**
 * Check if connection is slow (2g or slow-2g)
 */
export function isSlowConnection(status: OnlineStatus): boolean {
  return status.effectiveType === 'slow-2g' || status.effectiveType === '2g';
}

/**
 * Check if connection is fast enough for real-time features
 */
export function isFastConnection(status: OnlineStatus): boolean {
  return status.effectiveType === '4g' || (!!status.downlink && status.downlink > 5);
}
