import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function AuthCallback() {
  const navigate = useNavigate();
  const { presenter, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const errorParam = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');

        if (errorParam) {
          console.error('Auth callback error:', errorParam, errorDescription);
          setError(errorDescription || 'Authentication failed');
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        if (!isLoading) {
          if (presenter) {
            navigate('/dashboard');
          } else {
            navigate('/dashboard/profile');
          }
        }
      } catch (err) {
        console.error('Unexpected callback error:', err);
        setError('Something went wrong. Redirecting...');
        setTimeout(() => navigate('/'), 3000);
      }
    };

    handleCallback();
  }, [navigate, presenter, isLoading]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Authentication Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-violet-600" />
        <p className="text-gray-600">Signing you in...</p>
      </div>
    </div>
  );
}
