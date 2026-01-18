import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/features/auth/AuthContext'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { LoginPage } from '@/features/auth/LoginPage'
import { AuthCallback } from '@/features/auth/AuthCallback'
import { ProfileSetup } from '@/features/presenter/ProfileSetup'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-white text-gray-900">
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPlaceholder />
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
          </Routes>
          <Toaster />
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}

function DashboardPlaceholder() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-4 text-gray-600">You're authenticated!</p>
    </div>
  )
}

export default App
