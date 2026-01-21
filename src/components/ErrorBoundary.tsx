import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  children: ReactNode
  fallbackPath?: string
}

interface State {
  hasError: boolean
  error: Error | null
  errorContext: {
    pathname: string
    sessionId?: string
    timestamp: string
  } | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorContext: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Extract session ID from URL if present
    const pathname = window.location.pathname
    const sessionIdMatch = pathname.match(/\/sessions\/([^/]+)/)
    const sessionId = sessionIdMatch?.[1]

    return {
      hasError: true,
      error,
      errorContext: {
        pathname,
        sessionId,
        timestamp: new Date().toISOString(),
      },
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { errorContext } = this.state
    console.error('[ErrorBoundary] Caught error:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      pathname: errorContext?.pathname,
      sessionId: errorContext?.sessionId,
      timestamp: errorContext?.timestamp,
    })
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  handleBackToDashboard = () => {
    window.location.href = this.props.fallbackPath || '/dashboard'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Something went wrong</CardTitle>
              <CardDescription>
                We couldn't load this page. This might be a temporary issue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.error && (
                <details className="text-xs text-gray-500">
                  <summary className="cursor-pointer hover:text-gray-700">Technical details</summary>
                  <pre className="mt-2 whitespace-pre-wrap break-words bg-gray-100 p-2 rounded text-left">
{`Error: ${this.state.error.message}
Route: ${this.state.errorContext?.pathname || 'unknown'}
Session ID: ${this.state.errorContext?.sessionId || 'N/A'}
Time: ${this.state.errorContext?.timestamp || 'unknown'}`}
                  </pre>
                </details>
              )}
              <div className="flex flex-col gap-2">
                <Button onClick={this.handleRetry} className="w-full min-h-[48px]">
                  Try again
                </Button>
                <Button
                  variant="outline"
                  onClick={this.handleBackToDashboard}
                  className="w-full min-h-[48px]"
                >
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
