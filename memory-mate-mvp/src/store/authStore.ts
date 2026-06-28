import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '@/services/supabaseClient';
import * as authService from '@/services/authService';

/**
 * Auth state for the UI (ccc.30, Phase 3).
 *
 * Separate from the verse store: auth is a cross-cutting concern and sign-in is
 * optional (the app runs offline without it). When sync lands (Phase 4) it will
 * react to `session` becoming non-null to perform an initial sync.
 */
export interface AuthStore {
  session: Session | null;
  user: User | null;
  /** True once the initial session lookup has completed (avoids login UI flicker). */
  isAuthReady: boolean;
  /** In-flight sign-in/up/out request. */
  isAuthLoading: boolean;
  authError: string | null;

  /** Load any persisted session and subscribe to future auth changes. */
  initializeAuth: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
}

let unsubscribe: (() => void) | null = null;

/**
 * Kick off a sync when a session is present. Dynamic import avoids a static cycle
 * (syncService -> verseStore; authStore -> syncService). Failures are ignored —
 * sync is best-effort and offline-tolerant.
 */
function triggerSync(): void {
  import('@/services/syncService')
    .then((m) => m.sync())
    .catch(() => {});
}

export const useAuthStore = create<AuthStore>()((set, get) => ({
  session: null,
  user: null,
  isAuthReady: false,
  isAuthLoading: false,
  authError: null,

  initializeAuth: async () => {
    if (!isSupabaseConfigured) {
      set({ isAuthReady: true });
      return;
    }
    try {
      const session = await authService.getCurrentSession();
      set({ session, user: session?.user ?? null });
      if (session) triggerSync(); // already signed in at launch -> sync

      // Keep the store in sync with sign-in/out/token-refresh from anywhere.
      if (!unsubscribe) {
        unsubscribe = authService.onAuthStateChange((nextSession) => {
          set({ session: nextSession, user: nextSession?.user ?? null });
          if (nextSession) triggerSync();
        });
      }
    } catch (e) {
      console.error('[MemoryMate] Auth init failed:', e);
    } finally {
      set({ isAuthReady: true });
    }
  },

  signIn: async (email, password) => {
    set({ isAuthLoading: true, authError: null });
    try {
      const { session, user, error } = await authService.signIn(email, password);
      if (error) {
        set({ authError: error });
        return false;
      }
      set({ session, user });
      if (session) triggerSync(); // sign-in -> first sync (push local, pull remote)
      return true;
    } finally {
      set({ isAuthLoading: false });
    }
  },

  signUp: async (email, password) => {
    set({ isAuthLoading: true, authError: null });
    try {
      const { session, user, error } = await authService.signUp(email, password);
      if (error) {
        set({ authError: error });
        return false;
      }
      // session may be null if email confirmation is required.
      set({ session, user });
      return true;
    } finally {
      set({ isAuthLoading: false });
    }
  },

  signOut: async () => {
    set({ isAuthLoading: true, authError: null });
    try {
      const { error } = await authService.signOut();
      if (error) {
        set({ authError: error });
        return;
      }
      set({ session: null, user: null });
    } finally {
      set({ isAuthLoading: false });
    }
  },

  clearAuthError: () => set({ authError: null }),
}));
