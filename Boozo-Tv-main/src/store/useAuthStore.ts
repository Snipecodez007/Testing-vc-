import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/services/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

let listenerAttached = false;

/** Guards against a hung request (no response, no error) leaving the UI stuck forever. */
function withTimeout<T>(promise: Promise<T>, ms = 15000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out. Please try again.')), ms)
    ),
  ]);
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  error: null,

  initialize: async () => {
    if (!isSupabaseConfigured) {
      set({ loading: false });
      return;
    }

    try {
      // Restore existing session
      const { data } = await supabase.auth.getSession();
      set({
        session: data.session,
        user: data.session?.user ?? null,
        loading: false,
      });
    } catch (err) {
      console.error('[Auth] initialize failed:', err);
      set({ loading: false });
    }

    // Listen for auth changes (guard against duplicate listeners on re-mount/HMR)
    if (!listenerAttached) {
      listenerAttached = true;
      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session, user: session?.user ?? null, loading: false, error: null });
      });
    }
  },

  signUp: async (email, password, displayName) => {
    if (!isSupabaseConfigured) {
      set({ error: 'Auth is not configured. Add Supabase env vars.' });
      return;
    }
    set({ loading: true, error: null });
    try {
      const { error } = await withTimeout(supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      }));
      if (error) {
        set({ error: error.message });
      }
    } catch (err) {
      console.error('[Auth] signUp failed:', err);
      set({ error: 'Something went wrong. Check your connection and try again.' });
    } finally {
      set({ loading: false });
    }
  },

  signIn: async (email, password) => {
    if (!isSupabaseConfigured) {
      set({ error: 'Auth is not configured. Add Supabase env vars.' });
      return;
    }
    set({ loading: true, error: null });
    try {
      const { error } = await withTimeout(supabase.auth.signInWithPassword({ email, password }));
      if (error) {
        set({ error: error.message });
      }
    } catch (err) {
      console.error('[Auth] signIn failed:', err);
      set({ error: 'Something went wrong. Check your connection and try again.' });
    } finally {
      set({ loading: false });
    }
  },

  signInWithGoogle: async () => {
    if (!isSupabaseConfigured) {
      set({ error: 'Auth is not configured. Add Supabase env vars.' });
      return;
    }
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      // On success the browser navigates away to Google, so this only
      // matters on failure — reset loading so the button never stays stuck.
      if (error) {
        set({ error: error.message, loading: false });
      }
    } catch (err) {
      console.error('[Auth] signInWithGoogle failed:', err);
      set({ error: 'Something went wrong. Check your connection and try again.', loading: false });
    }
  },

  signOut: async () => {
    if (!isSupabaseConfigured) return;
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[Auth] signOut failed:', err);
    } finally {
      set({ user: null, session: null, loading: false, error: null });
    }
  },

  clearError: () => set({ error: null }),
}));
