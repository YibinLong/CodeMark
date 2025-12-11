"use client"

import React, { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/logger'
import { trackEvent } from '@/lib/monitoring/performance'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console and error tracking service
    logger.error('ErrorBoundary caught an error', error, {
      componentStack: errorInfo.componentStack,
    })

    // Track error in analytics
    trackEvent('component_error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    })

    this.setState({
      error,
      errorInfo,
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })

    // Call custom reset handler if provided
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="flex h-full w-full items-center justify-center bg-[#0d0d0d] p-8">
          <div className="max-w-md space-y-6 rounded-lg border border-red-500/20 bg-red-500/5 p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 shrink-0 text-red-500" />
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-red-500">
                  Something went wrong
                </h2>
                <p className="text-sm text-[#b4b4b4]">
                  An error occurred while rendering this component.
                </p>
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-mono text-red-400">
                      {this.state.error.message}
                    </p>
                    {this.state.errorInfo && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-[#808080] hover:text-[#b4b4b4]">
                          Component Stack
                        </summary>
                        <pre className="mt-2 overflow-auto rounded bg-[#1a1a1a] p-2 text-xs text-[#808080]">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </div>
            </div>

            <Button
              onClick={this.handleReset}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Specialized error boundary for Editor section
 */
export function EditorErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex h-full w-full items-center justify-center p-4">
          <div className="max-w-sm space-y-4 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <div>
              <h3 className="text-lg font-semibold">Editor Error</h3>
              <p className="text-sm text-muted-foreground mt-2">
                The code editor encountered an error. Try refreshing the page.
              </p>
            </div>
            <Button onClick={() => window.location.reload()} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reload Page
            </Button>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

/**
 * Specialized error boundary for Thread section
 */
export function ThreadErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex h-full w-full items-center justify-center p-4">
          <div className="max-w-sm space-y-4 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <div>
              <h3 className="text-lg font-semibold">Thread Error</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Unable to display this thread. The data may be corrupted.
              </p>
            </div>
            <Button onClick={() => window.location.reload()} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reload
            </Button>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

/**
 * Specialized error boundary for AI Response section
 */
export function AIResponseErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex items-center justify-center p-4 border rounded-lg border-red-500/20 bg-red-500/5">
          <div className="max-w-sm space-y-2 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
            <div>
              <h4 className="font-semibold">AI Response Error</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Failed to render AI response. Try requesting a new response.
              </p>
            </div>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
