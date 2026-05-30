import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { User, Session, AuthError, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ user: User | null; error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: AuthError | null }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

// Clear all user-specific localStorage data
// This is called on signOut and when user changes to prevent data leakage
const clearUserLocalStorage = () => {
  console.log('[Auth] Clearing user-specific localStorage data...');

  // List of all user-specific localStorage keys to clear
  const userSpecificKeys = [
    // Onboarding data
    'onboarding_data',

    // Topic caches
    'sparkfluence_cached_topics',
    'sparkfluence_scriptlab_topics',
    'sparkfluence_topic_refresh_rate',
    'sparkfluence_scriptlab_refresh_rate',

    // Script lab data
    'script_lab_data',

    // User preferences that should reset per user
    'sparkfluence_user_country',
    'sparkfluence_active_session',
  ];

  // Clear specific keys
  userSpecificKeys.forEach(key => {
    localStorage.removeItem(key);
  });

  // Clear all video progress keys (dynamic keys with session IDs)
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.startsWith('sparkfluence_video_progress_') ||
      key.startsWith('sparkfluence_image_cache_') ||
      key.startsWith('sparkfluence_broll_cache_')
    )) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));

  console.log('[Auth] Cleared', userSpecificKeys.length + keysToRemove.length, 'localStorage items');
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const isInitialized = useRef(false);
  const isSigningOut = useRef(false);
  const previousUserId = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        console.log('[Auth] Initializing...');
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[Auth] Init error:', error);
        }

        if (mounted) {
          console.log('[Auth] Init session:', currentSession ? 'Found' : 'None');

          // Store initial user ID for change detection
          if (currentSession?.user) {
            previousUserId.current = currentSession.user.id;
          }

          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          setLoading(false);
          isInitialized.current = true;
        }
      } catch (error) {
        console.error('[Auth] Init exception:', error);
        if (mounted) {
          setLoading(false);
          isInitialized.current = true;
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, newSession) => {
      console.log('[Auth] State change:', event, newSession ? 'Has session' : 'No session');

      if (!mounted) {
        console.log('[Auth] Ignoring - component unmounted');
        return;
      }

      // Ignore SIGNED_OUT if we're not actually signing out
      // This prevents race conditions where token refresh causes unwanted logout
      if (event === 'SIGNED_OUT' && !isSigningOut.current) {
        console.log('[Auth] Ignoring SIGNED_OUT - not initiated by user');
        // Double-check if we really have no session
        supabase.auth.getSession().then(({ data: { session: checkSession } }) => {
          if (checkSession) {
            console.log('[Auth] Session still valid, restoring...');
            setSession(checkSession);
            setUser(checkSession.user);
          } else {
            console.log('[Auth] Session confirmed gone, updating state');
            setSession(null);
            setUser(null);
          }
        });
        return;
      }

      // SECURITY: Clear localStorage when user changes (different user login)
      // This prevents data leakage between users on same browser
      const newUserId = newSession?.user?.id ?? null;
      if (event === 'SIGNED_IN' && newUserId && previousUserId.current && newUserId !== previousUserId.current) {
        console.log('[Auth] User changed detected! Previous:', previousUserId.current, 'New:', newUserId);
        clearUserLocalStorage();
      }

      // Skip state updates if user ID hasn't changed (token refresh, duplicate SIGNED_IN)
      // This prevents cascade re-renders across the entire app on window focus
      const isSameUser = newUserId && newUserId === previousUserId.current;
      if (isSameUser && isInitialized.current && (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN')) {
        // Only update session (for fresh token), NOT user (same reference = no re-render)
        setSession(newSession);
        return;
      }

      // Update previous user ID tracking
      previousUserId.current = newUserId;

      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);

      // Reset signing out flag after processing
      if (event === 'SIGNED_OUT') {
        isSigningOut.current = false;
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    console.log('[Auth] SignUp attempt');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    return { user: data.user, error };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    console.log('[Auth] SignIn attempt');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (data.user) {
      console.log('[Auth] SignIn success');
    } else {
      console.log('[Auth] SignIn failed:', error?.message);
    }

    return { user: data.user, error };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    console.log('[Auth] Google OAuth attempt');
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }, []);

  const signOut = useCallback(async () => {
    console.log('[Auth] SignOut initiated');
    isSigningOut.current = true;

    // Clear user-specific localStorage data before signing out
    clearUserLocalStorage();

    await supabase.auth.signOut();
  }, []);

  // Memoize value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
  }), [user, session, loading, signUp, signIn, signInWithGoogle, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
