import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { useSessions } from '@/hooks/useSessions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, LogOut, Copy, ExternalLink, BarChart3 } from 'lucide-react';

export function Dashboard() {
  const navigate = useNavigate();
  const { presenter, signOut } = useAuth();
  const { activeSessions, archivedSessions, loading, error } = useSessions();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-violet-600" />
          <p className="text-gray-600">Loading sessions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error Loading Sessions</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()} className="w-full">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasNoSessions = activeSessions.length === 0 && archivedSessions.length === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-600">
                Welcome back, {presenter?.name || 'there'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate('/dashboard/profile')}
                variant="outline"
                className="min-h-[48px]"
              >
                Edit Profile
              </Button>
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="min-h-[48px]"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {hasNoSessions ? (
          <Card className="mx-auto max-w-2xl">
            <CardHeader className="text-center">
              <CardTitle>No Sessions Yet</CardTitle>
              <CardDescription>
                Create your first session to start gathering feedback from your audience
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-6">
              <Button
                onClick={() => navigate('/dashboard/sessions/new')}
                size="lg"
                className="min-h-[56px]"
              >
                <Plus className="mr-2 h-5 w-5" />
                Create Your First Session
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Your Sessions</h2>
                <p className="text-sm text-gray-600">
                  {activeSessions.length} active • {archivedSessions.length} archived
                </p>
              </div>
              <Button
                onClick={() => navigate('/dashboard/sessions/new')}
                className="min-h-[56px]"
              >
                <Plus className="mr-2 h-5 w-5" />
                Create New Session
              </Button>
            </div>

            {activeSessions.length > 0 && (
              <div>
                <h3 className="mb-4 text-lg font-medium text-gray-900">Active Sessions</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {activeSessions.map((session) => (
                    <SessionCard key={session.id} session={session} />
                  ))}
                </div>
              </div>
            )}

            {archivedSessions.length > 0 && (
              <div>
                <h3 className="mb-4 text-lg font-medium text-gray-900">Archived Sessions</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {archivedSessions.map((session) => (
                    <SessionCard key={session.id} session={session} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

interface SessionCardProps {
  session: Session;
}

function SessionCard({ session }: SessionCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const stateVariants: Record<SessionState, 'default' | 'secondary' | 'outline'> = {
    draft: 'secondary',
    active: 'default',
    completed: 'outline',
    archived: 'secondary',
  };

  const stateLabels: Record<SessionState, string> = {
    draft: 'Draft',
    active: 'Active',
    completed: 'Completed',
    archived: 'Archived',
  };

  const shareableLink = `${window.location.origin}/s/${session.slug}`;

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(shareableLink);
      toast({
        title: 'Link copied',
        description: 'Shareable link copied to clipboard.',
      });
    } catch (err) {
      console.error('Failed to copy:', err);
      toast({
        variant: 'destructive',
        title: 'Copy failed',
        description: 'Unable to copy link.',
      });
    }
  };

  const handleViewFeedback = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/dashboard/sessions/${session.id}`);
  };

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2 text-base">
            {session.title || 'Untitled Session'}
          </CardTitle>
          <Badge variant={stateVariants[session.state]} className="shrink-0">
            {stateLabels[session.state]}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2">
          {session.summaryCondensed || session.summaryFull || 'No summary'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{session.lengthMinutes} min</span>
          <span>{(session.responseCount || 0) === 1 ? '1 response' : `${session.responseCount || 0} responses`}</span>
        </div>

        <div className="rounded-md bg-gray-50 px-3 py-2">
          <p className="text-xs text-gray-500 mb-1">Shareable link</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate text-xs text-gray-900">/s/{session.slug}</code>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyLink}
              className="h-8 w-8 p-0 shrink-0"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewFeedback}
            className="flex-1 min-h-[40px]"
          >
            <ExternalLink className="mr-1 h-4 w-4" />
            Open
          </Button>
          {(session.responseCount || 0) > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/dashboard/sessions/${session.id}`);
              }}
              className="flex-1 min-h-[40px]"
            >
              <BarChart3 className="mr-1 h-4 w-4" />
              Results
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

import type { Session, SessionState } from '@/types';
