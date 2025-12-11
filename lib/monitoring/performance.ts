/**
 * Performance monitoring and Core Web Vitals tracking
 * Integrates with Vercel Analytics and custom metrics collection
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

/**
 * Custom performance metric types
 */
export type CustomMetricName =
  | 'thread_creation'
  | 'ai_response_time'
  | 'editor_load'
  | 'thread_load'
  | 'review_generation';

export interface PerformanceMetric {
  name: string;
  value: number;
  rating?: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface LongTaskEntry {
  name: string;
  duration: number;
  startTime: number;
  attribution?: string;
}

/**
 * Metrics batch for sending to analytics
 */
interface MetricsBatch {
  coreWebVitals: PerformanceMetric[];
  customMetrics: PerformanceMetric[];
  longTasks: LongTaskEntry[];
  resourceTiming: PerformanceResourceTiming[];
}

// Global metrics storage
const metricsBatch: MetricsBatch = {
  coreWebVitals: [],
  customMetrics: [],
  longTasks: [],
  resourceTiming: [],
};

// Batch send interval (30 seconds)
const BATCH_SEND_INTERVAL = 30000;
let batchSendTimer: NodeJS.Timeout | null = null;

/**
 * Get rating based on metric thresholds
 */
function getRating(
  name: string,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  // Core Web Vitals thresholds based on Google standards
  const thresholds: Record<string, { good: number; poor: number }> = {
    LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint
    FID: { good: 100, poor: 300 }, // First Input Delay
    INP: { good: 200, poor: 500 }, // Interaction to Next Paint
    CLS: { good: 0.1, poor: 0.25 }, // Cumulative Layout Shift
    FCP: { good: 1800, poor: 3000 }, // First Contentful Paint
    TTFB: { good: 800, poor: 1800 }, // Time to First Byte
  };

  const threshold = thresholds[name];
  if (!threshold) return 'good';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Send metrics to analytics endpoint
 */
async function sendMetrics(metrics: Partial<MetricsBatch>) {
  if (
    process.env.NODE_ENV !== 'production' &&
    !process.env.NEXT_PUBLIC_ENABLE_ANALYTICS
  ) {
    // Log metrics in development
    console.log('[Performance Metrics]', metrics);
    return;
  }

  try {
    // Send to analytics endpoint
    await fetch('/api/analytics/performance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...metrics,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      }),
    });
  } catch (error) {
    console.error('[Performance] Failed to send metrics:', error);
  }
}

/**
 * Flush metrics batch
 */
function flushMetricsBatch() {
  if (
    metricsBatch.coreWebVitals.length === 0 &&
    metricsBatch.customMetrics.length === 0 &&
    metricsBatch.longTasks.length === 0 &&
    metricsBatch.resourceTiming.length === 0
  ) {
    return;
  }

  // Send metrics
  sendMetrics({ ...metricsBatch });

  // Clear batch
  metricsBatch.coreWebVitals = [];
  metricsBatch.customMetrics = [];
  metricsBatch.longTasks = [];
  metricsBatch.resourceTiming = [];
}

/**
 * Schedule batch send
 */
function scheduleBatchSend() {
  if (batchSendTimer) return;

  batchSendTimer = setInterval(flushMetricsBatch, BATCH_SEND_INTERVAL);

  // Flush on page unload
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', flushMetricsBatch);
  }
}

/**
 * Handle Core Web Vitals metric
 */
function handleCoreWebVital(metric: Metric) {
  const performanceMetric: PerformanceMetric = {
    name: metric.name,
    value: metric.value,
    rating: getRating(metric.name, metric.value),
    timestamp: Date.now(),
    metadata: {
      id: metric.id,
      navigationType: metric.navigationType,
    },
  };

  metricsBatch.coreWebVitals.push(performanceMetric);

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(
      `[Core Web Vital] ${metric.name}:`,
      metric.value.toFixed(2),
      performanceMetric.rating
    );
  }
}

/**
 * Initialize Core Web Vitals tracking
 */
export function initCoreWebVitals() {
  if (typeof window === 'undefined') return;

  // Track all Core Web Vitals
  onCLS(handleCoreWebVital);
  onFCP(handleCoreWebVital);
  onINP(handleCoreWebVital);
  onLCP(handleCoreWebVital);
  onTTFB(handleCoreWebVital);

  // Start batch sending
  scheduleBatchSend();
}

/**
 * Track custom performance metric
 */
export function trackCustomMetric(
  name: CustomMetricName,
  value: number,
  metadata?: Record<string, any>
) {
  const metric: PerformanceMetric = {
    name,
    value,
    timestamp: Date.now(),
    metadata,
  };

  metricsBatch.customMetrics.push(metric);

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Custom Metric] ${name}:`, value.toFixed(2), 'ms', metadata);
  }
}

/**
 * Create performance mark
 */
export function mark(name: string) {
  if (typeof performance === 'undefined') return;

  try {
    performance.mark(name);
  } catch (error) {
    console.warn(`[Performance] Failed to create mark "${name}":`, error);
  }
}

/**
 * Measure performance between two marks
 */
export function measure(
  name: string,
  startMark: string,
  endMark?: string
): number | null {
  if (typeof performance === 'undefined') return null;

  try {
    const measureName = `measure:${name}`;

    // Create end mark if not provided
    if (!endMark) {
      endMark = `${startMark}:end`;
      performance.mark(endMark);
    }

    // Create measure
    performance.measure(measureName, startMark, endMark);

    // Get measure value
    const entries = performance.getEntriesByName(measureName, 'measure');
    const entry = entries[entries.length - 1];

    if (entry) {
      const duration = entry.duration;

      // Clean up marks
      performance.clearMarks(startMark);
      if (endMark.endsWith(':end')) {
        performance.clearMarks(endMark);
      }
      performance.clearMeasures(measureName);

      return duration;
    }

    return null;
  } catch (error) {
    console.warn(`[Performance] Failed to measure "${name}":`, error);
    return null;
  }
}

/**
 * Convenience function for tracking timed operations
 */
export async function trackOperation<T>(
  metricName: CustomMetricName,
  operation: () => Promise<T> | T,
  metadata?: Record<string, any>
): Promise<T> {
  const startMark = `${metricName}:start`;
  mark(startMark);

  try {
    const result = await operation();
    const duration = measure(metricName, startMark);

    if (duration !== null) {
      trackCustomMetric(metricName, duration, metadata);
    }

    return result;
  } catch (error) {
    // Still measure on error
    const duration = measure(metricName, startMark);
    if (duration !== null) {
      trackCustomMetric(metricName, duration, {
        ...metadata,
        error: true,
      });
    }
    throw error;
  }
}

/**
 * Initialize Long Task observer
 */
export function initLongTaskObserver() {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'longtask' && entry.duration > 50) {
          const longTask: LongTaskEntry = {
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime,
            attribution: (entry as any).attribution?.[0]?.name,
          };

          metricsBatch.longTasks.push(longTask);

          if (process.env.NODE_ENV === 'development') {
            console.warn(
              '[Long Task]',
              entry.name,
              `${entry.duration.toFixed(2)}ms`,
              longTask.attribution
            );
          }
        }
      }
    });

    observer.observe({ entryTypes: ['longtask'] });
  } catch (error) {
    console.warn('[Performance] Long Task observer not supported:', error);
  }
}

/**
 * Initialize Resource Timing observer
 */
export function initResourceTimingObserver() {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries() as PerformanceResourceTiming[];

      // Filter for large or slow resources
      const significantResources = entries.filter(
        (entry) =>
          entry.duration > 1000 || // Slow loading (>1s)
          entry.transferSize > 500000 // Large file (>500KB)
      );

      if (significantResources.length > 0) {
        metricsBatch.resourceTiming.push(...significantResources);

        if (process.env.NODE_ENV === 'development') {
          significantResources.forEach((entry) => {
            console.log(
              '[Slow Resource]',
              entry.name,
              `${entry.duration.toFixed(2)}ms`,
              `${(entry.transferSize / 1024).toFixed(2)}KB`
            );
          });
        }
      }
    });

    observer.observe({ entryTypes: ['resource'] });
  } catch (error) {
    console.warn('[Performance] Resource Timing observer not supported:', error);
  }
}

/**
 * Initialize all performance monitoring
 */
export function initPerformanceMonitoring() {
  if (typeof window === 'undefined') return;

  // Core Web Vitals
  initCoreWebVitals();

  // Long Tasks
  initLongTaskObserver();

  // Resource Timing
  initResourceTimingObserver();

  if (process.env.NODE_ENV === 'development') {
    console.log('[Performance] Monitoring initialized');
  }
}

/**
 * Track analytics event (for user actions)
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, any>
) {
  if (typeof window === 'undefined') return;

  // Vercel Analytics integration
  if (typeof (window as any).va === 'function') {
    (window as any).va('event', eventName, properties);
  }

  // Custom analytics endpoint
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS
  ) {
    fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: eventName,
        properties,
        timestamp: Date.now(),
        url: window.location.href,
      }),
    }).catch((error) => {
      console.error('[Analytics] Failed to track event:', error);
    });
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics Event]', eventName, properties);
  }
}
