import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/features/auth/AuthContext'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { LoginPage } from '@/features/auth/LoginPage'
import { AuthCallback } from '@/features/auth/AuthCallback'
import { ProfileSetup } from '@/features/presenter/ProfileSetup'
import { Dashboard } from '@/features/presenter/Dashboard'
import { SessionCreate } from '@/features/sessions/SessionCreate'
import { SessionDetail } from '@/features/sessions/SessionDetail'
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
                  <SessionCreate />
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
