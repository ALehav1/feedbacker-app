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
  const { user, presenter, refetchPresenter } = useAuth();
  const { toast } = useToast();

  // Pre-populate form if editing existing profile
  const [formData, setFormData] = useState({
    name: '',
    organization: '',
  });

  // Initialize form with presenter data if editing
  useEffect(() => {
    if (presenter) {
      setFormData({
        name: presenter.name,
        organization: presenter.organization,
      });
    }
  }, [presenter]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if form has changes from original presenter data
  const hasChanges = !presenter || (
    formData.name.trim() !== presenter.name ||
    formData.organization.trim() !== presenter.organization
  );

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{presenter ? 'Edit Profile' : 'Complete Your Profile'}</CardTitle>
          <CardDescription>
            {presenter ? 'Update your profile information' : 'Tell us a bit about yourself to get started'}
          </CardDescription>
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
                placeholder="Jane Smith"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isSubmitting}
                required
                className="min-h-[48px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="organization">
                Organization <span className="text-red-500">*</span>
              </Label>
              <Input
                id="organization"
                type="text"
                placeholder="Acme Corp"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                disabled={isSubmitting}
                required
                className="min-h-[48px]"
              />
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
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
