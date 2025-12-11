'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

/**
 * Service Worker registration component
 * Registers the service worker for offline functionality
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    // Only register in production or when explicitly enabled
    if (
      'serviceWorker' in navigator &&
      (process.env.NODE_ENV === 'production' ||
        process.env.NEXT_PUBLIC_ENABLE_SW === 'true')
    ) {
      registerServiceWorker();
    }
  }, []);

  return null;
}

async function registerServiceWorker() {
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    logger.info('Service Worker registered successfully', {
      scope: registration.scope,
    });

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker available
          logger.info('New service worker available');

          // Notify user about update (optional)
          if (confirm('A new version is available. Reload to update?')) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
          }
        }
      });
    });

    // Handle controller change
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      logger.info('Service Worker controller changed');
    });
  } catch (error) {
    logger.error('Service Worker registration failed', error as Error);
  }
}
