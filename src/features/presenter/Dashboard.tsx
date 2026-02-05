import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { useSessions } from '@/hooks/useSessions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, LogOut, ExternalLink, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { DASHBOARD_BADGES } from '@/lib/copy';
import type { Session, SessionState } from '@/types';

export function Dashboard() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { activeSessions, archivedSessions, loading, error, refetch } = useSessions();
  const [activeFilter, setActiveFilter] = useState<'open' | 'closed'>('open');
  // Prevent browser back from exiting the app when on Dashboard
  // Uses a simple sentinel approach: push an extra history entry so first back stays in app
  useEffect(() => {
    // Only set up the guard once per session to avoid duplicate entries
    const guardKey = 'dashboard-back-guard-set';
    if (sessionStorage.getItem(guardKey)) return;

    // Push a sentinel entry - user's first back press will land here, still on dashboard
    window.history.pushState({ sentinel: true }, '', '/dashboard');
    sessionStorage.setItem(guardKey, 'true');

    // Clear the guard flag when session ends (tab close, navigate away)
    const clearGuard = () => sessionStorage.removeItem(guardKey);
    window.addEventListener('beforeunload', clearGuard);

    return () => window.removeEventListener('beforeunload', clearGuard);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-violet-600" />
          <p className="text-gray-600">Loading presentations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error Loading Presentations</CardTitle>
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
  const activeFeedbackSessions = activeSessions.filter((s) => s.state === 'active');
  const closedFeedbackSessions = activeSessions.filter((s) => s.state === 'completed');
  const activeSessionsToShow = activeFilter === 'open'
    ? activeFeedbackSessions
    : closedFeedbackSessions;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto w-full max-w-screen-sm px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Presentation Feedbacker</h1>
              <p className="text-sm text-gray-600">
                Get feedback on your proposed presentation topics from prospective participants.
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
              <CardTitle>No Presentations Yet</CardTitle>
              <CardDescription>
                Create your first presentation to start gathering feedback from your audience
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-6">
              <Button
                onClick={() => navigate('/dashboard/sessions/new')}
                size="lg"
                className="h-14 w-full sm:w-auto"
              >
                <Plus className="mr-2 h-5 w-5" />
                Create Your First Presentation
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => navigate('/dashboard/sessions/new')}
                className="h-12 w-full justify-center sm:w-auto"
              >
                <Plus className="mr-2 h-5 w-5" />
                Create New Presentation
              </Button>
            </div>

            <div>
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-medium text-gray-900">Active Presentations</h3>
                <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setActiveFilter('open')}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      activeFilter === 'open'
                        ? 'bg-green-100 text-green-800'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Feedback open
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter('closed')}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      activeFilter === 'closed'
                        ? 'bg-blue-100 text-blue-800'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Feedback closed
                  </button>
                </div>
              </div>

              {activeSessionsToShow.length > 0 ? (
                <div className="space-y-3">
                  {activeSessionsToShow.map((session) => (
                    <SessionCard key={session.id} session={session} onSessionChange={refetch} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  {activeFilter === 'open'
                    ? 'No active presentations with feedback open.'
                    : 'No active presentations with feedback closed.'}
                </p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

interface SessionCardProps {
  session: Session;
  onSessionChange: () => Promise<void>;
}

function SessionCard({ session, onSessionChange }: SessionCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showNoResponseDialog, setShowNoResponseDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const responseCount = session.responseCount ?? 0;

  const getStateBadgeClassName = (state: SessionState): string => {
    const baseClasses = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold';
    
    switch (state) {
      case 'active':
        return `${baseClasses} bg-green-100 text-green-800 border border-green-200`;
      case 'draft':
        return `${baseClasses} bg-gray-100 text-gray-700 border border-gray-200`;
      case 'completed':
        return `${baseClasses} bg-slate-100 text-slate-700 border border-slate-200`;
      // archived state exists in DB but not exposed in UI
      default:
        return `${baseClasses} bg-gray-100 text-gray-600 border border-gray-200`;
    }
  };

  const stateLabels: Record<SessionState, string> = {
    draft: 'Draft',
    active: 'Feedback open',
    completed: 'Feedback closed',
    archived: 'Archived',
  };

  const handleViewFeedback = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/dashboard/sessions/${session.id}`);
  };

  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (responseCount === 0) {
      setShowNoResponseDialog(true);
    } else {
      setShowCloseDialog(true);
    }
  };

  const handleCloseFeedback = async (navigateToResults: boolean) => {
    setIsTransitioning(true);
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ state: 'completed' })
        .eq('id', session.id);

      if (error) {
        console.error('Error closing feedback:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to close feedback',
          description: 'Please try again.',
        });
        return;
      }

      toast({
        title: 'Feedback closed',
        description: 'Participants can no longer submit feedback.',
      });

      await onSessionChange();

      // Navigate based on whether we had responses
      if (navigateToResults) {
        navigate(`/dashboard/sessions/${session.id}?tab=results&focus=deck`);
      }
      // If no responses (close anyway), stay on dashboard
    } catch (err) {
      console.error('Unexpected error closing feedback:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Something went wrong.',
      });
    } finally {
      setIsTransitioning(false);
      setShowCloseDialog(false);
      setShowNoResponseDialog(false);
    }
  };

  const handleDelete = async () => {
    setIsTransitioning(true);
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', session.id);

      if (error) {
        console.error('Error deleting session:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to delete',
          description: 'Please try again.',
        });
        return;
      }

      toast({
        title: 'Presentation deleted',
        description: 'The presentation and all feedback have been removed.',
      });

      await onSessionChange();
    } catch (err) {
      console.error('Unexpected error deleting session:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Something went wrong.',
      });
    } finally {
      setIsTransitioning(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 flex-1 text-base font-semibold text-gray-900">
            {session.title || 'Untitled Presentation'}
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
          <span>{session.responseCount == null ? '— responses' : session.responseCount === 1 ? '1 response' : `${session.responseCount} responses`}</span>
        </div>

        <div className="px-1">
          {session.publishedTopics && session.publishedTopics.length > 0 ? (
            <span className="text-xs font-medium text-green-700">Participant link active</span>
          ) : (
            <span className="text-xs font-medium text-gray-500">Not published</span>
          )}
        </div>

        {/* Primary action: always Open details */}
        <Button
          variant="outline"
          onClick={handleViewFeedback}
          className="h-12 w-full"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Open details
        </Button>

        {/* Secondary action based on state */}
        {session.state === 'active' && (
          <Button
            variant="destructive"
            onClick={handleCloseClick}
            className="w-full min-h-[48px]"
          >
            Close participant feedback
          </Button>
        )}
        {session.state === 'completed' && (
          <Button
            variant="destructive"
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteDialog(true);
            }}
            className="h-12 w-full"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete presentation
          </Button>
        )}
      </div>

      {/* Close Feedback Dialog (has responses) */}
      <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close participant feedback?</AlertDialogTitle>
            <AlertDialogDescription>
              Participants can no longer submit feedback once closed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleCloseFeedback(true)} disabled={isTransitioning}>
              {isTransitioning ? 'Closing...' : 'Close participant feedback'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* No Response Dialog (0 responses) */}
      <AlertDialog open={showNoResponseDialog} onOpenChange={setShowNoResponseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>No feedback received yet</AlertDialogTitle>
            <AlertDialogDescription>
              This session has 0 participant responses. Keep feedback open to allow more responses?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowNoResponseDialog(false)}>
              Keep feedback open
            </AlertDialogAction>
            <AlertDialogCancel
              onClick={() => handleCloseFeedback(false)}
              disabled={isTransitioning}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isTransitioning ? 'Closing...' : 'Close anyway'}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete presentation?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the presentation and all audience feedback.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isTransitioning}>
              {isTransitioning ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
