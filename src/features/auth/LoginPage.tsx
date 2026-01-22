import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const LOADING_TIMEOUT_MS = 8000; // Show fallback after 8s

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [showStillLoading, setShowStillLoading] = useState(false);
  const { signIn, isAuthenticated, presenter, isLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Set up loading timeout
  useEffect(() => {
    if (!isLoading) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = setTimeout(() => setShowStillLoading(true), LOADING_TIMEOUT_MS);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isLoading]);

  // Redirect authenticated users to dashboard
  // Note: Using push navigation (not replace) to preserve history entry
  // This ensures browser back doesn't exit the app
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(presenter ? '/dashboard' : '/dashboard/profile');
    }
  }, [isLoading, isAuthenticated, presenter, navigate]);

  // Show loading while checking auth state
  if (isLoading) {
    const effectiveShowStillLoading = isLoading && showStillLoading;
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-gray-50 p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-violet-600" />
          <p className="text-gray-600">Loading...</p>
          {effectiveShowStillLoading && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-gray-500">Still loading? This is taking longer than expected.</p>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="min-h-[44px]"
              >
                Retry
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        variant: 'destructive',
        title: 'Email required',
        description: 'Please enter your email address.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await signIn(email);

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Sign in failed',
          description: 'Unable to send magic link. Please try again.',
        });
        console.error('Sign in error details:', error);
      } else {
        setEmailSent(true);
        toast({
          title: 'Check your email',
          description: 'We sent you a magic link to sign in.',
        });
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Unexpected error',
        description: 'Something went wrong. Please try again.',
      });
      console.error('Unexpected error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (emailSent) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We sent a magic link to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Click the link in the email to sign in. The link will expire in 1 hour.
            </p>
            <p className="text-sm text-gray-600">
              Don't see it? Check your spam folder.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setEmailSent(false);
                setEmail('');
              }}
            >
              Use a different email
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100svh] items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Presentation Feedbacker</CardTitle>
          <CardDescription>
            Get feedback on your proposed presentation topics from prospective participants.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                required
                className="min-h-[48px]"
              />
            </div>
            <Button
              type="submit"
              className="w-full min-h-[56px]"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Send magic link'}
            </Button>
            <p className="text-xs text-gray-500 text-center">
              No password needed. We'll email you a secure link to sign in.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
