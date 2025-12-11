import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * POST /api/analytics/performance
 * Endpoint for receiving performance metrics from the client
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Log performance metrics
    logger.info('Performance metrics received', {
      coreWebVitals: data.coreWebVitals?.length || 0,
      customMetrics: data.customMetrics?.length || 0,
      longTasks: data.longTasks?.length || 0,
      resourceTiming: data.resourceTiming?.length || 0,
      url: data.url,
      userAgent: data.userAgent,
    });

    // In a production environment, you would:
    // 1. Send metrics to your analytics service (e.g., Datadog, New Relic, Sentry)
    // 2. Store in a database for analysis
    // 3. Aggregate and create dashboards

    // For now, just log the detailed metrics in development
    if (process.env.NODE_ENV === 'development') {
      if (data.coreWebVitals && data.coreWebVitals.length > 0) {
        logger.debug('Core Web Vitals:', data.coreWebVitals);
      }
      if (data.longTasks && data.longTasks.length > 0) {
        logger.warn('Long Tasks detected:', data.longTasks);
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error('Failed to process performance metrics', error as Error);
    return NextResponse.json(
      { error: 'Failed to process metrics' },
      { status: 500 }
    );
  }
}
