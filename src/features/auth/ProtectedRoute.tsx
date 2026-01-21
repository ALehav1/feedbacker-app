/**
 * BASELINE_LOCK (Jan 18, 2026)
 * This module is part of the frozen baseline. Avoid edits unless fixing a confirmed bug.
 * If edits are required: keep diff minimal and document reason in docs/BASELINE_LOCK.md.
 */

import { useState, useEffect, useRef, type ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: ReactNode;
}

const LOADING_TIMEOUT_MS = 6000; // Show "still loading" fallback after 6s

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [showStillLoading, setShowStillLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Set up timer when loading starts
  useEffect(() => {
    if (!isLoading) {
      // Clear timer on cleanup, but don't set state here
      return;
    }

    // Start timer to show "still loading" after timeout
    timerRef.current = setTimeout(() => {
      setShowStillLoading(true);
    }, LOADING_TIMEOUT_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isLoading]);

  // Derive showStillLoading = false when not loading
  // Only showStillLoading = true when timer fires AND still loading
  const effectiveShowStillLoading = isLoading && showStillLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-violet-600" />
          <p className="text-gray-600">Loading...</p>
          {effectiveShowStillLoading && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-gray-500">Still loading? This is taking longer than expected.</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="min-h-[44px]"
                >
                  Retry
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/')}
                  className="min-h-[44px]"
                >
                  Back to Login
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
