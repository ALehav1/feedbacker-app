/**
 * BASELINE_LOCK (Jan 18, 2026)
 * This module is part of the frozen baseline. Avoid edits unless fixing a confirmed bug.
 * If edits are required: keep diff minimal and document reason in docs/BASELINE_LOCK.md.
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom'
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

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-white text-gray-900">
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/s/:slug" element={<FeedbackForm />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/profile"
              element={
                <ProtectedRoute>
                  <ProfileSetup />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/sessions/new"
              element={
                <ProtectedRoute>
                  <SessionCreateWizard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/sessions/:sessionId/edit"
              element={
                <ProtectedRoute>
                  <SessionEdit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/sessions/:sessionId"
              element={
                <ProtectedRoute>
                  <SessionDetail />
                </ProtectedRoute>
              }
            />
          </Routes>
          <Toaster />
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
