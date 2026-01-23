import { Stack } from 'expo-router';
import '../../global.css';

export default function RootLayout() {
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
