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

    const handleSession = async (session: Session | null) => {
      try {
        const nextUserId = session?.user?.id ?? null;

        if (nextUserId === lastUserId) {
          setUser(session?.user ?? null);
          return;
        }

        lastUserId = nextUserId;

        if (!nextUserId) {
          setUser(null);
          setPresenter(null);
          return;
        }

        setUser(session!.user);
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
        try {
          console.log('Auth state changed:', event);
          await handleSession(session);
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          console.error('Auth state change handler error:', err);
        } finally {
          if (isMounted) setIsLoading(false);
        }
      }
    );

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!isMounted) return;
        setUser(session?.user ?? null);
      })
      .catch((err) => {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          console.error('Error initializing auth:', err);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
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
