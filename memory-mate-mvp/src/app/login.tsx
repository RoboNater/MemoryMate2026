import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/store';
import { isSupabaseConfigured } from '@/services/supabaseClient';

/**
 * Login screen (ccc.30, Phase 3).
 *
 * Optional sign-in to enable cross-device sync. The same form toggles between
 * "Sign In" and "Create Account". On success it returns to the previous screen
 * (Settings); the app remains usable offline whether or not the user signs in.
 */
export default function LoginScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const isAuthLoading = useAuthStore((s) => s.isAuthLoading);
  const authError = useAuthStore((s) => s.authError);
  const clearAuthError = useAuthStore((s) => s.clearAuthError);

  const isSignup = mode === 'signup';
  const canSubmit = email.trim().length > 0 && password.length >= 6 && !isAuthLoading;

  const handleSubmit = async () => {
    setNotice(null);
    clearAuthError();
    if (isSignup) {
      const ok = await signUp(email, password);
      if (ok) {
        // If email confirmation is enabled, there may be no session yet.
        const session = useAuthStore.getState().session;
        if (session) {
          router.back();
        } else {
          setNotice('Account created. Check your email to confirm, then sign in.');
          setMode('signin');
        }
      }
    } else {
      const ok = await signIn(email, password);
      if (ok) router.back();
    }
  };

  const toggleMode = () => {
    clearAuthError();
    setNotice(null);
    setMode(isSignup ? 'signin' : 'signup');
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerClassName="p-6" keyboardShouldPersistTaps="handled">
        <Text className="text-2xl font-bold text-gray-900 mb-1">
          {isSignup ? 'Create Account' : 'Sign In'}
        </Text>
        <Text className="text-gray-600 mb-6">
          {isSignup
            ? 'Create an account to sync your verses across all your devices.'
            : 'Sign in to sync your verses across all your devices.'}
        </Text>

        {!isSupabaseConfigured && (
          <View className="bg-amber-50 p-3 rounded-lg border border-amber-200 mb-4">
            <Text className="text-amber-800 text-sm">
              Cloud sync isn't configured on this build. You can still use the app offline.
            </Text>
          </View>
        )}

        <Text className="text-sm font-semibold text-gray-700 mb-1">Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          className="bg-white border border-gray-300 rounded-lg p-3 mb-4 text-base text-gray-900"
        />

        <Text className="text-sm font-semibold text-gray-700 mb-1">Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="At least 6 characters"
          secureTextEntry
          autoCapitalize="none"
          className="bg-white border border-gray-300 rounded-lg p-3 mb-2 text-base text-gray-900"
        />

        {authError && <Text className="text-red-600 text-sm mb-2">{authError}</Text>}
        {notice && <Text className="text-green-700 text-sm mb-2">{notice}</Text>}

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!canSubmit}
          className={`rounded-lg p-4 mt-2 ${canSubmit ? 'bg-blue-600' : 'bg-blue-300'}`}
        >
          {isAuthLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-center font-semibold text-base">
              {isSignup ? 'Create Account' : 'Sign In'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleMode} className="p-3 mt-2">
          <Text className="text-blue-600 text-center text-sm">
            {isSignup
              ? 'Already have an account? Sign in'
              : "Don't have an account? Create one"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
