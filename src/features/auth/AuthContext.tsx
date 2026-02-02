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

interface AuthContextType {
  user: User | null;
  presenter: Presenter | null;
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
        return null;
      }

      if (data) {
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

      return null;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return null;
      }
      console.error('Unexpected error fetching presenter:', err);
      return null;
    }
  };

  const refetchPresenter = async () => {
    if (user) {
      const presenterData = await fetchPresenter(user.id);
      setPresenter(presenterData);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let lastUserId: string | null = null;

    // Log timestamp for debugging bootstrap timing
    const bootStart = Date.now();
    if (import.meta.env.DEV) {
      console.log('[Auth] Bootstrap starting at', new Date().toISOString());
    }

    const handleSession = async (session: Session | null, source: string, isInitialBoot = false) => {
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
          // Still need to clear loading on initial boot even if user hasn't changed
          if (isInitialBoot && isMounted) {
            setIsLoading(false);
            if (import.meta.env.DEV) {
              console.log('[Auth] Bootstrap complete (same user). Elapsed:', Date.now() - bootStart, 'ms');
            }
          }
          return;
        }

        lastUserId = nextUserId;

        if (!nextUserId) {
          setUser(null);
          setPresenter(null);
          return;
        }

        setUser(session!.user);

        // On initial boot, set loading false BEFORE fetching presenter
        // This ensures the app doesn't hang if presenter fetch is slow
        if (isInitialBoot && isMounted) {
          setIsLoading(false);
          if (import.meta.env.DEV) {
            console.log('[Auth] Bootstrap complete (session found). Elapsed:', Date.now() - bootStart, 'ms');
          }
        }

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
          await handleSession(session, `onAuthStateChange:${event}`);
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          console.error('Auth state change handler error:', err);
        }
        // Don't set isLoading false here - wait for initial bootstrap
        // Only set loading false after initial getSession completes
        // Auth state changes after that are handled without blocking UI
      }
    );

    const getSessionWithRetry = async (retries = 3): Promise<void> => {
      for (let i = 0; i < retries; i++) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (import.meta.env.DEV) {
            console.log('[Auth] getSession result:', session ? 'has session' : 'no session', 'elapsed:', Date.now() - bootStart);
          }
          if (!isMounted) return;
          // Pass isInitialBoot=true so loading is set false before presenter fetch
          await handleSession(session, 'getSession', true);
          return;
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') {
            console.log('[Auth] getSession AbortError, retrying...', i + 1);
            await new Promise(r => setTimeout(r, 100 * (i + 1)));
            continue;
          }
          console.error('[Auth] getSession error:', err);
          return;
        }
      }
      console.warn('[Auth] getSession failed after retries');
    };

    // Bootstrap: getSession determines auth state
    // Loading is set false inside handleSession for authenticated users (before presenter fetch)
    // For unauthenticated users or errors, set loading false here
    getSessionWithRetry().finally(() => {
      if (isMounted) {
        // Always ensure loading is false after bootstrap attempt
        setIsLoading(false);
        if (import.meta.env.DEV) {
          console.log('[Auth] Bootstrap finally block. Elapsed:', Date.now() - bootStart, 'ms');
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
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
