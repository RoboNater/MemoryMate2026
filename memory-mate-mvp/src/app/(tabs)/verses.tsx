import { View, Text, Pressable } from 'react-native';
import { Link } from 'expo-router';

export default function VersesScreen() {
  return (
    <View className="flex-1 bg-white p-4">
      <View className="mb-6">
        <Text className="text-2xl font-bold text-gray-800 mb-2">
          My Verses
        </Text>
        <Text className="text-gray-500 text-sm">
          Supports UC-1.2: View verse list
        </Text>
      </View>

      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-400 italic mb-8">
          Verse list will appear here in Phase 3...
        </Text>
      </View>

      <Link href="/verse/add" asChild>
        <Pressable className="bg-blue-600 p-4 rounded-lg items-center mb-4 active:bg-blue-700">
          <Text className="text-white font-semibold text-center">
            + Add New Verse
          </Text>
        </Pressable>
      </Link>

      <Text className="text-xs text-gray-400 text-center">
        UC-1.1: Add verse | UC-1.2: View list | UC-1.3: View details
      </Text>
    </View>
  );
}
