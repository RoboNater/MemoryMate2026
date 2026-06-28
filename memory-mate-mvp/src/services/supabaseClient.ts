/**
 * Supabase client — the shared cloud backend for cross-device sync (ccc.30).
 *
 * Configuration comes from EXPO_PUBLIC_* env vars (see .env / .env.example), which
 * Expo inlines into the bundle at build time. The anon/publishable key is meant to
 * be public; Row Level Security on the server is what actually protects the data.
 *
 * Session persistence:
 *   - Native (iOS/Android): AsyncStorage.
 *   - Web: the gotrue default (localStorage); detectSessionInUrl handles OAuth redirects.
 *
 * If the env vars are absent the app still runs fully offline against local SQLite;
 * `isSupabaseConfigured` lets callers skip cloud work gracefully.
 */
import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** True when both Supabase env vars are present, so cloud sync can be attempted. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    '[MemoryMate] Supabase env vars missing (EXPO_PUBLIC_SUPABASE_URL / ' +
      'EXPO_PUBLIC_SUPABASE_ANON_KEY). Cloud sync is disabled; the app runs offline only.'
  );
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    // Native needs an explicit storage adapter; web uses the gotrue default.
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // URL session detection only makes sense on web (OAuth redirect handling).
    detectSessionInUrl: Platform.OS === 'web',
  },
});
