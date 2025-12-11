'use client';

/**
 * Connection status indicator component
 * Shows connection state in app header/status bar
 */

import { useOnlineStatus, isSlowConnection } from '@/lib/hooks/useOnlineStatus';
import { Wifi, WifiOff, WifiLow } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  className?: string;
  showLabel?: boolean;
}

export function ConnectionStatus({ className, showLabel = false }: ConnectionStatusProps) {
  const status = useOnlineStatus({ showToasts: true });

  if (status.isOnline && !isSlowConnection(status)) {
    // Good connection - don't show indicator
    if (!showLabel) return null;

    return (
      <div className={cn('flex items-center gap-2 text-xs text-muted-foreground', className)}>
        <Wifi className="h-3 w-3" />
        <span>Online</span>
      </div>
    );
  }

  if (!status.isOnline) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 text-xs text-red-500',
          className
        )}
      >
        <WifiOff className="h-3 w-3" />
        {showLabel && <span>Offline</span>}
      </div>
    );
  }

  if (isSlowConnection(status)) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 text-xs text-yellow-500',
          className
        )}
      >
        <WifiLow className="h-3 w-3" />
        {showLabel && <span>Slow connection</span>}
      </div>
    );
  }

  return null;
}

/**
 * Badge variant for connection status
 */
export function ConnectionStatusBadge() {
  const status = useOnlineStatus({ showToasts: false });

  if (!status.isOnline) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-500 border border-red-500/20">
        <WifiOff className="h-3 w-3" />
        <span>Offline</span>
      </div>
    );
  }

  if (isSlowConnection(status)) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-500 border border-yellow-500/20">
        <WifiLow className="h-3 w-3" />
        <span>Slow</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-500 border border-green-500/20">
      <Wifi className="h-3 w-3" />
      <span>Online</span>
    </div>
  );
}
