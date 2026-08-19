import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { View, Text, ActivityIndicator } from 'react-native';
import { useVerseStore, useAuthStore } from '@/store';
import '../../global.css';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  // Selectors, not the whole store: this gate is above the router, so
  // subscribing to every field re-rendered the entire app on each write.
  // `initError` specifically -- a failed write sets `error`, which is the
  // calling screen's problem to report, not grounds for unmounting the app
  // and showing "Failed to load" over it (#39).
  const initialize = useVerseStore((s) => s.initialize);
  const initError = useVerseStore((s) => s.initError);
  const initializeAuth = useAuthStore((s) => s.initializeAuth);

  useEffect(() => {
    async function init() {
      try {
        // Local DB is required; auth is optional (offline-first) so it must never
        // block startup — load any persisted session alongside, ignoring failures.
        await Promise.all([initialize(), initializeAuth().catch(() => {})]);
        setIsReady(true);
      } catch (e) {
        console.error('Failed to initialize app:', e);
        setIsReady(true); // Show error UI
      }
    }
    init();
    // Startup must run exactly once. `initialize` and `initializeAuth` are
    // deliberately omitted: re-running them would re-open the database and
    // reload the session on any store change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isReady) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="mt-4 text-gray-600">Loading Memory Mate...</Text>
      </View>
    );
  }

  if (initError) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-6">
        <Text className="text-red-500 text-lg font-semibold mb-2">Failed to load</Text>
        <Text className="text-gray-600 text-center">{initError}</Text>
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
        }}
      />
      {/* Stack screens that appear on top of tabs */}
      <Stack.Screen
        name="verse/add"
        options={{
          title: 'Add Verse',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="verse/[id]/index"
        options={{
          title: 'Verse Details',
        }}
      />
      <Stack.Screen
        name="verse/[id]/edit"
        options={{
          title: 'Edit Verse',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="practice/[id]"
        options={{
          title: 'Practice Verse',
        }}
      />
      <Stack.Screen
        name="practice/session"
        options={{
          title: 'Practice Session',
        }}
      />
      <Stack.Screen
        name="practice/summary"
        options={{
          title: 'Practice Results',
        }}
      />
      <Stack.Screen
        name="test/[id]"
        options={{
          title: 'Test Verse',
        }}
      />
      <Stack.Screen
        name="test/session"
        options={{
          title: 'Test Session',
        }}
      />
      <Stack.Screen
        name="test/summary"
        options={{
          title: 'Test Results',
        }}
      />
      <Stack.Screen
        name="login"
        options={{
          title: 'Cloud Sync',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
