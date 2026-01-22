/**
 * BASELINE_LOCK (Jan 18, 2026)
 * This module is part of the frozen baseline. Avoid edits unless fixing a confirmed bug.
 * If edits are required: keep diff minimal and document reason in docs/BASELINE_LOCK.md.
 *
 * FIX: Migrated from BrowserRouter to createBrowserRouter (data router) to support
 * useBlocker hook in SessionEdit. useBlocker requires a data router context.
 */

import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/features/auth/AuthContext'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { LoginPage } from '@/features/auth/LoginPage'
import { AuthCallback } from '@/features/auth/AuthCallback'
import { ProfileSetup } from '@/features/presenter/ProfileSetup'
import { Dashboard } from '@/features/presenter/Dashboard'
import { SessionCreateWizard } from '@/features/sessions/SessionCreateWizard'
import { SessionDetail } from '@/features/sessions/SessionDetail'
import { SessionEdit } from '@/features/sessions/SessionEdit'
import { FeedbackForm } from '@/features/participant/FeedbackForm'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// Root layout wraps all routes with AuthProvider and common UI
function RootLayout() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-white text-gray-900">
        <Outlet />
        <Toaster />
      </div>
    </AuthProvider>
  )
}

// Data router configuration (required for useBlocker support)
const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <LoginPage /> },
      { path: '/auth/callback', element: <AuthCallback /> },
      { path: '/s/:slug', element: <FeedbackForm /> },
      {
        path: '/dashboard',
        element: (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: '/dashboard/profile',
        element: (
          <ProtectedRoute>
            <ProfileSetup />
          </ProtectedRoute>
        ),
      },
      {
        path: '/dashboard/sessions/new',
        element: (
          <ProtectedRoute>
            <SessionCreateWizard />
          </ProtectedRoute>
        ),
      },
      {
        path: '/dashboard/sessions/:sessionId/edit',
        element: (
          <ProtectedRoute>
            <ErrorBoundary>
              <SessionEdit />
            </ErrorBoundary>
          </ProtectedRoute>
        ),
      },
      {
        path: '/dashboard/sessions/:sessionId',
        element: (
          <ProtectedRoute>
            <ErrorBoundary>
              <SessionDetail />
            </ErrorBoundary>
          </ProtectedRoute>
        ),
      },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
