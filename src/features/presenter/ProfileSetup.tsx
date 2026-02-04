import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export function ProfileSetup() {
  const navigate = useNavigate();
  const { user, presenter, presenterStatus, refetchPresenter, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();

  // Track if we've done the initial presenter check
  const [hasCheckedPresenter, setHasCheckedPresenter] = useState(false);

  // Mode: 'confirm' for returning users, 'edit' for new/editing
  const [mode, setMode] = useState<'confirm' | 'edit'>('edit');

  // Pre-populate form if editing existing profile
  const [formData, setFormData] = useState({
    name: '',
    organization: '',
  });

  // Initialize form with presenter data and set mode
  useEffect(() => {
    // Don't set mode until auth is done loading
    if (isAuthLoading) return;

    if (presenter) {
      setFormData({
        name: presenter.name,
        organization: presenter.organization,
      });
      // Returning user: start in confirm mode
      setMode('confirm');
    } else {
      // New user: start in edit mode
      setMode('edit');
    }
    setHasCheckedPresenter(true);
  }, [presenter, isAuthLoading]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if form has changes from original presenter data
  const hasChanges = !presenter || (
    formData.name.trim() !== presenter.name ||
    formData.organization.trim() !== presenter.organization
  );

  const getInitials = (name: string): string => {
    const trimmed = name.trim();
    if (!trimmed) return '?';
    const parts = trimmed.split(' ').filter(p => p.length > 0);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Authentication error',
        description: 'Please sign in again.',
      });
      navigate('/');
      return;
    }

    if (!formData.name.trim() || !formData.organization.trim()) {
      toast({
        variant: 'destructive',
        title: 'Required fields',
        description: 'Please fill in all required fields.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('presenters')
        .upsert(
          {
            id: user.id,
            email: user.email!,
            name: formData.name.trim(),
            organization: formData.organization.trim(),
          },
          { onConflict: 'id' }
        );

      if (error) {
        console.error('Profile creation error:', error);
        toast({
          variant: 'destructive',
          title: 'Profile creation failed',
          description: 'Unable to create your profile. Please try again.',
        });
        return;
      }

      await refetchPresenter();

      toast({
        title: presenter ? 'Profile updated' : 'Profile created',
        description: presenter ? 'Your changes have been saved.' : 'Welcome to Feedbacker App!',
      });

      navigate('/dashboard');
    } catch (err) {
      console.error('Unexpected error:', err);
      toast({
        variant: 'destructive',
        title: 'Unexpected error',
        description: 'Something went wrong. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading spinner while checking auth/presenter state
  if (isAuthLoading || presenterStatus === 'loading' || !hasCheckedPresenter) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-violet-600" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Presenter fetch failed — show retry
  if (presenterStatus === 'error') {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Unable to load profile</CardTitle>
            <CardDescription>There was a problem loading your profile.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={() => refetchPresenter()} className="w-full min-h-[48px]">
              Retry
            </Button>
            <Button variant="outline" onClick={() => navigate('/dashboard')} className="w-full min-h-[48px]">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Confirm mode: show profile summary with Continue/Edit buttons
  if (mode === 'confirm' && presenter) {
    return (
      <div className="min-h-[100svh] bg-gray-50">
        <header className="border-b bg-white">
          <div className="mx-auto w-full max-w-screen-sm px-4 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Presentation Feedbacker</h1>
            <p className="text-sm text-gray-600">
              Get feedback on your proposed presentation topics from prospective participants.
            </p>
          </div>
        </header>
        <main className="mx-auto w-full max-w-screen-sm px-4 py-8">
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                <span className="text-2xl font-semibold">{getInitials(presenter.name)}</span>
              </div>
              <div className="flex-1">
                <CardTitle>Welcome back!</CardTitle>
                <CardDescription>Your profile is ready</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-gray-500">Email</Label>
                <p className="text-sm font-medium text-gray-900">{user?.email}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Name</Label>
                <p className="text-sm font-medium text-gray-900">{presenter.name}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Organization</Label>
                <p className="text-sm font-medium text-gray-900">{presenter.organization}</p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => navigate('/dashboard')}
                className="w-full min-h-[56px]"
              >
                Continue
              </Button>
              <Button
                variant="outline"
                onClick={() => setMode('edit')}
                className="w-full min-h-[48px]"
              >
                Edit profile
              </Button>
            </div>
          </CardContent>
        </Card>
        </main>
      </div>
    );
  }

  // Edit mode: show form
  return (
    <div className="min-h-[100svh] bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto w-full max-w-screen-sm px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Presentation Feedbacker</h1>
          <p className="text-sm text-gray-600">
            Get feedback on your proposed presentation topics from prospective participants.
          </p>
        </div>
      </header>
      <main className="mx-auto w-full max-w-screen-sm px-4 py-8">
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
              <span className="text-2xl font-semibold">{getInitials(formData.name)}</span>
            </div>
            <div className="flex-1">
              <CardTitle>{presenter ? 'Edit Profile' : 'Welcome! Complete Your Profile'}</CardTitle>
              <CardDescription>
                {presenter ? 'Update your profile information' : 'Tell us a bit about yourself to get started'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="min-h-[48px] bg-gray-50"
              />
              <p className="text-xs text-gray-500">
                This is your verified email address
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                Your Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Ari Lehavi"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isSubmitting}
                required
                className="min-h-[48px]"
              />
              <p className="text-xs text-gray-500">
                Your full name as you'd like it to appear
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="organization">
                Organization <span className="text-red-500">*</span>
              </Label>
              <Input
                id="organization"
                type="text"
                placeholder="Moody's Analytics"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                disabled={isSubmitting}
                required
                className="min-h-[48px]"
              />
              <p className="text-xs text-gray-500">
                Your company or organization name
              </p>
            </div>

            <Button
              type="submit"
              className="w-full min-h-[56px]"
              disabled={isSubmitting || !hasChanges}
            >
              {isSubmitting
                ? (presenter ? 'Saving...' : 'Creating profile...')
                : (presenter ? (hasChanges ? 'Save Changes' : 'No Changes') : 'Complete setup')}
            </Button>
            {presenter && (
              <Button
                type="button"
                variant="outline"
                className="w-full min-h-[48px]"
                onClick={() => navigate('/dashboard')}
                disabled={isSubmitting}
              >
                Back to Dashboard
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
      </main>
    </div>
  );
}
