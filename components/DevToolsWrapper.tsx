'use client';

/**
 * Client-side wrapper for DevTools panel
 * Manages visibility and keyboard shortcuts
 */

import { DevToolsPanel, useDevTools } from './DevToolsPanel';

export function DevToolsWrapper() {
  const { isOpen, setIsOpen } = useDevTools();

  // Only render in development or when explicitly enabled
  const isEnabled =
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_ENABLE_DEVTOOLS === 'true';

  if (!isEnabled) return null;

  return <DevToolsPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />;
}
