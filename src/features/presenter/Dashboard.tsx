import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { useSessions } from '@/hooks/useSessions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, LogOut } from 'lucide-react';

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

  const stateColors = {
    draft: 'bg-gray-100 text-gray-800',
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    archived: 'bg-gray-100 text-gray-600',
  };

  const stateLabels = {
    draft: 'Draft',
    active: 'Active',
    completed: 'Completed',
    archived: 'Archived',
  };

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => navigate(`/dashboard/sessions/${session.id}`)}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2 text-base">
            {session.title || 'Untitled Session'}
          </CardTitle>
          <span
            className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
              stateColors[session.state]
            }`}
          >
            {stateLabels[session.state]}
          </span>
        </div>
        <CardDescription className="line-clamp-2">
          {session.summaryCondensed || session.summaryFull || 'No summary'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{session.lengthMinutes} min</span>
          <span>{session.updatedAt.toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}

import type { Session } from '@/types';
