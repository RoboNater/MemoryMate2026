import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { View, Text, ActivityIndicator } from 'react-native';
import { useVerseStore } from '@/store';
import '../../global.css';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const { initialize, isLoading, error } = useVerseStore();

  useEffect(() => {
    async function init() {
      try {
        await initialize();
        setIsReady(true);
      } catch (e) {
        console.error('Failed to initialize app:', e);
        setIsReady(true); // Show error UI
      }
    }
    init();
  }, []);

  if (!isReady || isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="mt-4 text-gray-600">Loading Memory Mate...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-6">
        <Text className="text-red-500 text-lg font-semibold mb-2">Failed to load</Text>
        <Text className="text-gray-600 text-center">{error}</Text>
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
        name="test/[id]"
        options={{
          title: 'Test Verse',
        }}
      />
    </Stack>
  );
}
