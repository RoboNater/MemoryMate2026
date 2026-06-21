/**
 * Auth service — thin wrapper over Supabase Auth for cross-device sync (ccc.30).
 *
 * Sign-in is OPTIONAL: the app works fully offline against local SQLite without an
 * account. Signing in identifies the user so their data can sync across devices.
 * One account = the user, shared across all their devices.
 */
import type { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface AuthResult {
  user: User | null;
  session: Session | null;
  error: string | null;
}

function messageFor(error: AuthError | null): string | null {
  return error ? error.message : null;
}

/** Current session (null if signed out or Supabase isn't configured). */
export async function getCurrentSession(): Promise<Session | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Sign in with email + password. */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!isSupabaseConfigured) {
    return { user: null, session: null, error: 'Cloud sync is not configured.' };
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  return { user: data.user, session: data.session, error: messageFor(error) };
}

/**
 * Create an account with email + password. Depending on the project's email-
 * confirmation setting, `session` may be null until the address is confirmed.
 */
export async function signUp(email: string, password: string): Promise<AuthResult> {
  if (!isSupabaseConfigured) {
    return { user: null, session: null, error: 'Cloud sync is not configured.' };
  }
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  });
  return { user: data.user, session: data.session, error: messageFor(error) };
}

/** Sign out the current user on this device. */
export async function signOut(): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) return { error: null };
  const { error } = await supabase.auth.signOut();
  return { error: messageFor(error) };
}

/**
 * Subscribe to auth state changes (sign-in, sign-out, token refresh).
 * Returns an unsubscribe function.
 */
export function onAuthStateChange(
  callback: (session: Session | null) => void
): () => void {
  if (!isSupabaseConfigured) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => data.subscription.unsubscribe();
}
