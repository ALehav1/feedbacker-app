import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthContext';
import type { Session, SessionState } from '@/types';

// Supabase row type (matches schema.sql: NOT NULL DEFAULT '' for text fields)
interface SessionRow {
  id: string
  presenter_id: string
  state: string
  length_minutes: number
  title: string
  welcome_message: string
  summary_full: string
  summary_condensed: string
  slug: string
  topics_source: string
  published_welcome_message?: string
  published_summary_condensed?: string
  published_summary_full?: string
  published_topics: { themeId: string; text: string; sortOrder: number }[] // JSONB array from database
  published_at?: string
  has_unpublished_changes: boolean
  created_at: string
  updated_at: string
}

interface UseSessionsReturn {
  sessions: Session[];
  activeSessions: Session[];
  archivedSessions: Session[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSessions(): UseSessionsReturn {
  const { user, isLoading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    // Wait for auth to complete before determining if user is logged in
    if (authLoading) {
      // Still loading auth - keep loading state true
      return;
    }

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

      const sessionRows = (data as SessionRow[] | null) || [];
      const sessionIds = sessionRows.map((row) => row.id);

      const responseCounts = new Map<string, number>();
      if (sessionIds.length > 0) {
        const { data: countsData, error: countsError } = await supabase
          .from('responses')
          .select('session_id')
          .in('session_id', sessionIds);

        if (countsError) {
          console.error('Error fetching response counts:', countsError);
        } else if (countsData) {
          countsData.forEach((row: { session_id: string }) => {
            responseCounts.set(row.session_id, (responseCounts.get(row.session_id) || 0) + 1);
          });
        }
      }

      const mappedSessions: Session[] = sessionRows.map((row) => ({
        id: row.id,
        presenterId: row.presenter_id,
        state: row.state as SessionState,
        lengthMinutes: row.length_minutes,
        title: row.title,
        welcomeMessage: row.welcome_message,
        summaryFull: row.summary_full,
        summaryCondensed: row.summary_condensed,
        slug: row.slug,
        topicsSource: (row.topics_source as 'generated' | 'manual') || 'generated',
        publishedWelcomeMessage: row.published_welcome_message,
        publishedSummaryCondensed: row.published_summary_condensed,
        publishedSummaryFull: row.published_summary_full,
        publishedTopics: row.published_topics || [],
        publishedAt: row.published_at ? new Date(row.published_at) : undefined,
        hasUnpublishedChanges: row.has_unpublished_changes || false,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        responseCount: responseCounts.get(row.id) || 0,
      }));

      setSessions(mappedSessions);
    } catch (err) {
      console.error('Unexpected error fetching sessions:', err);
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [user, authLoading]);

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
