import { NextResponse } from 'next/server';

/**
 * GET /api/health
 * Health check endpoint for monitoring and service status verification
 *
 * Returns:
 * - 200: Service is healthy
 * - 503: Service is degraded or unhealthy
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // Check required environment variables
    const envChecks = {
      openai_api_key_configured: !!process.env.OPENAI_API_KEY,
    };

    // Check OpenAI API connectivity (with timeout)
    let openaiStatus: 'connected' | 'error' | 'unconfigured' = 'unconfigured';
    let openaiError: string | undefined;

    if (envChecks.openai_api_key_configured) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const response = await fetch('https://api.openai.com/v1/models', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          openaiStatus = 'connected';
        } else {
          openaiStatus = 'error';
          openaiError = `HTTP ${response.status}`;
        }
      } catch (error) {
        openaiStatus = 'error';
        openaiError = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    const responseTime = Date.now() - startTime;

    // Determine overall health status
    const isHealthy =
      envChecks.openai_api_key_configured &&
      openaiStatus === 'connected';

    const status = isHealthy ? 'healthy' : 'degraded';
    const statusCode = isHealthy ? 200 : 503;

    // Build response
    const healthResponse = {
      status,
      version: process.env.npm_package_version || '1.0.0',
      timestamp: Date.now(),
      uptime: process.uptime ? Math.floor(process.uptime()) : undefined,
      responseTime,
      checks: {
        environment: envChecks,
        services: {
          openai: {
            status: openaiStatus,
            error: openaiError,
          },
        },
      },
      metadata: {
        nodeVersion: process.version,
        platform: process.platform,
        env: process.env.NODE_ENV,
      },
    };

    return NextResponse.json(healthResponse, { status: statusCode });
  } catch (error) {
    // Critical error - return 503
    return NextResponse.json(
      {
        status: 'error',
        version: process.env.npm_package_version || '1.0.0',
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Health check failed',
      },
      { status: 503 }
    );
  }
}
