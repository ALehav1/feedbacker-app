/**
 * BASELINE_LOCK (Jan 18, 2026)
 * This module is part of the frozen baseline. Avoid edits unless fixing a confirmed bug.
 * If edits are required: keep diff minimal and document reason in docs/BASELINE_LOCK.md.
 */

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Presenter } from '@/types';

export type PresenterStatus = 'loading' | 'ready' | 'not_found' | 'error';

interface AuthContextType {
  user: User | null;
  presenter: Presenter | null;
  presenterStatus: PresenterStatus;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refetchPresenter: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [presenter, setPresenter] = useState<Presenter | null>(null);
  const [presenterStatus, setPresenterStatus] = useState<PresenterStatus>('loading');
  const [isLoading, setIsLoading] = useState(true);

  const fetchPresenter = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('presenters')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching presenter:', error);
        setPresenterStatus('error');
        return null;
      }

      if (data) {
        setPresenterStatus('ready');
        return {
          id: data.id,
          email: data.email,
          name: data.name,
          organization: data.organization,
          logoUrl: data.logo_url,
          brandGuidelinesUrl: data.brand_guidelines_url,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
        } as Presenter;
      }

      setPresenterStatus('not_found');
      return null;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return null;
      }
      console.error('Unexpected error fetching presenter:', err);
      setPresenterStatus('error');
      return null;
    }
  };

  const refetchPresenter = async () => {
    if (user) {
      setPresenterStatus('loading');
      const presenterData = await fetchPresenter(user.id);
      setPresenter(presenterData);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let lastUserId: string | null = null;
    let bootstrapResolved = false;

    // Log timestamp for debugging bootstrap timing
    const bootStart = Date.now();
    if (import.meta.env.DEV) {
      console.log('[Auth] Bootstrap starting at', new Date().toISOString());
    }

    const resolveWithSession = (session: Session | null, source: string) => {
      if (bootstrapResolved || !isMounted) return;
      bootstrapResolved = true;
      setUser(session?.user ?? null);
      if (!session?.user) {
        setPresenter(null);
        setPresenterStatus('loading');
      }
      setIsLoading(false);
      if (import.meta.env.DEV) {
        console.log('[Auth] Bootstrap resolved via', source, 'Elapsed:', Date.now() - bootStart, 'ms');
      }
    };

    const handleSession = async (session: Session | null, source: string) => {
      try {
        const nextUserId = session?.user?.id ?? null;

        if (import.meta.env.DEV) {
          console.log(`[Auth] handleSession (${source}):`, {
            nextUserId: nextUserId?.slice(0, 8),
            lastUserId: lastUserId?.slice(0, 8),
            elapsed: Date.now() - bootStart,
          });
        }

        if (nextUserId === lastUserId) {
          setUser(session?.user ?? null);
          resolveWithSession(session, source);
          return;
        }

        lastUserId = nextUserId;

        if (!nextUserId) {
          setUser(null);
          setPresenter(null);
          setPresenterStatus('loading');
          resolveWithSession(null, source);
          return;
        }

        setUser(session!.user);

        // Resolve bootstrap immediately once a valid session exists
        resolveWithSession(session, source);

        const presenterData = await fetchPresenter(nextUserId);
        if (!isMounted) return;
        setPresenter(presenterData);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('Error handling session:', err);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Log all auth events in dev mode for debugging
        if (import.meta.env.DEV) {
          console.log('[Auth] onAuthStateChange:', event, session ? 'has session' : 'no session');
        }
        try {
          // If a valid session arrives, resolve immediately
          if (session) {
            resolveWithSession(session, `onAuthStateChange:${event}`);
          }
          await handleSession(session, `onAuthStateChange:${event}`);
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          console.error('Auth state change handler error:', err);
        }
      }
    );

    // Timeout wrapper to prevent hanging promises
    const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
        ),
      ]);
    };

    const getSessionOnce = async (): Promise<void> => {
      try {
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          2000,
          'getSession'
        );
        if (import.meta.env.DEV) {
          console.log('[Auth] getSession result:', session ? 'has session' : 'no session', 'elapsed:', Date.now() - bootStart);
        }
        if (!isMounted) return;
        if (session) {
          resolveWithSession(session, 'getSession');
        } else if (!bootstrapResolved) {
          resolveWithSession(null, 'getSession');
        }
        await handleSession(session, 'getSession');
      } catch (err) {
        if (err instanceof Error && err.message.includes('timed out')) {
          if (import.meta.env.DEV) {
            console.warn('[Auth] getSession timeout (non-blocking)');
          }
        } else {
          console.error('[Auth] getSession error:', err);
        }
        if (!bootstrapResolved) {
          resolveWithSession(null, 'getSession-timeout');
        }
      }
    };

    // Hard stop watchdog: never allow bootstrap spinner beyond 2500ms
    const watchdog = setTimeout(() => {
      if (!bootstrapResolved && isMounted) {
        resolveWithSession(null, 'watchdog');
      }
    }, 2500);

    getSessionOnce();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(watchdog);
    };
  }, []);

  const signIn = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error('Sign in error:', error);
        return { error };
      }

      return { error: null };
    } catch (err) {
      console.error('Unexpected sign in error:', err);
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setPresenter(null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const value: AuthContextType = {
    user,
    presenter,
    presenterStatus,
    isAuthenticated: !!user,
    isLoading,
    signIn,
    signOut,
    refetchPresenter,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
