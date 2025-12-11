"use client"

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/logger'
import { AlertCircle, Home, RefreshCw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to error reporting service
    logger.error('Route error', error)
  }, [error])

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#0d0d0d] p-8">
      <div className="max-w-md space-y-6 rounded-lg border border-red-500/20 bg-red-500/5 p-8">
        <div className="flex items-start gap-4">
          <AlertCircle className="h-8 w-8 shrink-0 text-red-500" />
          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-red-500">
              Oops! Something went wrong
            </h1>
            <p className="text-sm text-[#b4b4b4]">
              We encountered an unexpected error. This has been logged and we'll
              look into it.
            </p>
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 rounded bg-[#1a1a1a] p-3">
                <p className="text-xs font-mono text-red-400">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="mt-2 text-xs text-[#808080]">
                    Error ID: {error.digest}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={reset}
            variant="default"
            className="flex-1"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button
            onClick={() => window.location.href = '/'}
            variant="outline"
            className="flex-1"
          >
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Button>
        </div>
      </div>
    </div>
  )
}
