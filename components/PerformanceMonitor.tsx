'use client';

import { useEffect } from 'react';
import { initPerformanceMonitoring } from '@/lib/monitoring/performance';

/**
 * Performance monitoring initialization component
 * Initializes Core Web Vitals, Long Task, and Resource Timing observers
 */
export function PerformanceMonitor() {
  useEffect(() => {
    // Initialize performance monitoring on mount
    initPerformanceMonitoring();
  }, []);

  // This component doesn't render anything
  return null;
}
