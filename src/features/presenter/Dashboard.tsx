import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { useSessions } from '@/hooks/useSessions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, LogOut, Copy, ExternalLink, BarChart3 } from 'lucide-react';
import { DASHBOARD_BADGES } from '@/lib/copy';
import type { Session, SessionState } from '@/types';

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
        <div className="mx-auto w-full max-w-screen-sm px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-600">
                Welcome back, {presenter?.name || 'there'}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                onClick={() => navigate('/dashboard/profile')}
                variant="outline"
                className="h-12 w-full sm:w-auto"
              >
                Edit Profile
              </Button>
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="h-12 w-full sm:w-auto"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-screen-sm px-4 pt-6 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        {hasNoSessions ? (
          <Card>
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
                className="h-14 w-full sm:w-auto"
              >
                <Plus className="mr-2 h-5 w-5" />
                Create Your First Session
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col gap-3">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Your Sessions</h2>
                <p className="text-sm text-gray-600">
                  {activeSessions.length} active • {archivedSessions.length} archived
                </p>
              </div>
              <Button
                onClick={() => navigate('/dashboard/sessions/new')}
                className="h-12 w-full justify-center sm:w-auto"
              >
                <Plus className="mr-2 h-5 w-5" />
                Create New Session
              </Button>
            </div>

            {activeSessions.length > 0 && (
              <div>
                <h3 className="mb-3 text-lg font-medium text-gray-900">Active Sessions</h3>
                <div className="space-y-3">
                  {activeSessions.map((session) => (
                    <SessionCard key={session.id} session={session} />
                  ))}
                </div>
              </div>
            )}

            {archivedSessions.length > 0 && (
              <div>
                <h3 className="mb-3 text-lg font-medium text-gray-900">Archived Sessions</h3>
                <div className="space-y-3">
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

  const baseUrl = import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin;

  const getStateBadgeClassName = (state: SessionState): string => {
    const baseClasses = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold';
    
    switch (state) {
      case 'active':
        return `${baseClasses} bg-green-100 text-green-800 border border-green-200`;
      case 'draft':
        return `${baseClasses} bg-gray-100 text-gray-700 border border-gray-200`;
      case 'completed':
        return `${baseClasses} bg-slate-100 text-slate-700 border border-slate-200`;
      case 'archived':
        return `${baseClasses} bg-gray-50 text-gray-500 border border-gray-200`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-600 border border-gray-200`;
    }
  };

  const stateLabels: Record<SessionState, string> = {
    draft: 'Draft',
    active: 'Active',
    completed: 'Completed',
    archived: 'Archived',
  };

  const shareableLink = `${baseUrl}/s/${session.slug}`;

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
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 flex-1 text-base font-semibold text-gray-900">
            {session.title || 'Untitled Session'}
          </h3>
          <div className="flex shrink-0 gap-2">
            <span className={getStateBadgeClassName(session.state)}>
              {stateLabels[session.state]}
            </span>
            {session.hasUnpublishedChanges && (
              <span
                className="rounded-full border border-amber-500 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700"
                title={DASHBOARD_BADGES.updatesPendingTooltip}
              >
                {DASHBOARD_BADGES.updatesPending}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span>{session.lengthMinutes} min</span>
          <span>•</span>
          <span>{(session.responseCount || 0) === 1 ? '1 response' : `${session.responseCount || 0} responses`}</span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <code className="flex-1 truncate text-xs text-gray-700">
              {baseUrl}/s/{session.slug}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyLink}
              className="h-8 w-8 shrink-0 p-0"
              title="Copy link"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-600 px-1">
            {session.state === 'draft' && (
              <span className="font-medium text-amber-700">Draft — preview only</span>
            )}
            {session.state === 'active' && (
              <span className="font-medium text-green-700">Active — collecting feedback</span>
            )}
            {session.state === 'completed' && (
              <span className="font-medium text-gray-700">Completed — feedback closed</span>
            )}
            {session.state === 'archived' && (
              <span className="font-medium text-gray-500">Archived</span>
            )}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleViewFeedback}
            className="h-12 flex-1"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open
          </Button>
          {(session.responseCount || 0) > 0 && (
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/dashboard/sessions/${session.id}`);
              }}
              className="h-12 flex-1"
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Results
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
