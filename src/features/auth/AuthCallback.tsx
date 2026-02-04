/**
 * BASELINE_LOCK (Jan 18, 2026)
 * This module is part of the frozen baseline. Avoid edits unless fixing a confirmed bug.
 * If edits are required: keep diff minimal and document reason in docs/BASELINE_LOCK.md.
 */

import { useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { Button } from '@/components/ui/button'

export function AuthCallback() {
  const navigate = useNavigate()
  const { user, presenterStatus, isLoading } = useAuth()
  const didNavigate = useRef(false)
  const timeoutRef = useRef<number | null>(null)

  // Check if URL has auth tokens (magic link)
  const hasAuthToken = useMemo(() => {
    const hash = window.location.hash
    const search = window.location.search
    return hash.includes('access_token') || search.includes('code=')
  }, [])

  // Parse error details from URL params once
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const errorDetails = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const errorParam = params.get('error') || hashParams.get('error')
    if (!errorParam) return null

    const errorCode = params.get('error_code') || hashParams.get('error_code')
    const errorDescription = params.get('error_description') || hashParams.get('error_description') || 'Authentication failed'

    return { errorDescription, isExpired: errorCode === 'otp_expired' }
  }, [])

  const error = errorDetails?.errorDescription ?? null
  const isExpiredLink = errorDetails?.isExpired ?? false

  useEffect(() => {
    // For expired links, don't auto-redirect - let user click the button
    if (error && !isExpiredLink) {
      timeoutRef.current = window.setTimeout(() => {
        navigate('/', { replace: true })
      }, 1500)
      return () => {
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
      }
    }

    if (isLoading) return
    if (didNavigate.current) return

    // If we have auth tokens in URL but no user yet, wait for Supabase to process them
    if (hasAuthToken && !user) return

    // Wait for presenter check to complete before routing
    if (presenterStatus === 'loading') return

    didNavigate.current = true
    navigate(presenterStatus === 'ready' ? '/dashboard' : '/dashboard/profile', { replace: true })

    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    }
  }, [navigate, user, presenterStatus, isLoading, error, isExpiredLink, hasAuthToken])

  if (error) {
    // Special handling for expired/used magic links
    if (isExpiredLink) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
          <div className="text-center max-w-md">
            <h1 className="mb-2 text-2xl font-bold text-gray-900">Sign-in link expired</h1>
            <p className="mb-6 text-gray-600">
              This link expired or was already used. Request a new one.
            </p>
            <Button
              onClick={() => navigate('/', { replace: true })}
              className="min-h-[48px]"
            >
              Send me a new link
            </Button>
          </div>
        </div>
      )
    }

    // Generic error with auto-redirect
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