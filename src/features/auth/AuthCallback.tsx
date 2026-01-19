import { useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'

export function AuthCallback() {
  const navigate = useNavigate()
  const { presenter, isLoading } = useAuth()
  const didNavigate = useRef(false)
  const timeoutRef = useRef<number | null>(null)

  // Parse error from URL params once (memoized to prevent re-computation)
  const error = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const errorParam = params.get('error') || hashParams.get('error')
    if (!errorParam) return null
    return params.get('error_description') || hashParams.get('error_description') || 'Authentication failed'
  }, [])

  useEffect(() => {
    if (error) {
      timeoutRef.current = window.setTimeout(() => {
        navigate('/', { replace: true })
      }, 1500)
      return () => {
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
      }
    }

    if (isLoading) return
    if (didNavigate.current) return

    didNavigate.current = true
    navigate(presenter ? '/dashboard' : '/dashboard/profile', { replace: true })

    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    }
  }, [navigate, presenter, isLoading, error])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Authentication Error</h1>
          <p className="mb-4 text-gray-600">{error}</p>
          <p className="text-sm text-gray-500">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-violet-600" />
        <p className="text-gray-600">Signing you in...</p>
      </div>
    </div>
  )
}