import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthContext';
import type { Session, SessionState } from '@/types';

interface UseSessionsReturn {
  sessions: Session[];
  activeSessions: Session[];
  archivedSessions: Session[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSessions(): UseSessionsReturn {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    if (!user) {
      setSessions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('sessions')
        .select('*')
        .eq('presenter_id', user.id)
        .order('updated_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching sessions:', fetchError);
        setError('Failed to load sessions');
        return;
      }

      const mappedSessions: Session[] = (data || []).map((row) => ({
        id: row.id,
        presenterId: row.presenter_id,
        state: row.state as SessionState,
        lengthMinutes: row.length_minutes,
        title: row.title,
        welcomeMessage: row.welcome_message,
        summaryFull: row.summary_full,
        summaryCondensed: row.summary_condensed,
        slug: row.slug,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      }));

      setSessions(mappedSessions);
    } catch (err) {
      console.error('Unexpected error fetching sessions:', err);
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const activeSessions = sessions.filter(
    (s) => s.state === 'draft' || s.state === 'active' || s.state === 'completed'
  );

  const archivedSessions = sessions.filter((s) => s.state === 'archived');

  return {
    sessions,
    activeSessions,
    archivedSessions,
    loading,
    error,
    refetch: fetchSessions,
  };
}
