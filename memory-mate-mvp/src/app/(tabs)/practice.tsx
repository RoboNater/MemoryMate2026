import { View, Text, Pressable } from 'react-native';
import { Link } from 'expo-router';

export default function PracticeScreen() {
  return (
    <View className="flex-1 bg-white p-4">
      <View className="mb-6">
        <Text className="text-2xl font-bold text-gray-800 mb-2">
          Practice
        </Text>
        <Text className="text-gray-500 text-sm">
          Supports UC-2.1 & UC-2.2: Start practice sessions
        </Text>
      </View>

      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-600 mb-6 text-center">
          Select verses to practice from your collection
        </Text>
        <Text className="text-gray-400 italic mb-8">
          Verse selection and practice flow coming in Phase 3...
        </Text>
      </View>

      <Link href="/practice/1" asChild>
        <Pressable className="bg-green-600 p-4 rounded-lg items-center mb-4 active:bg-green-700">
          <Text className="text-white font-semibold text-center">
            Start Practice (Demo)
          </Text>
        </Pressable>
      </Link>

      <Text className="text-xs text-gray-400 text-center">
        UC-2.1: Start session | UC-2.2: Practice verse | UC-2.3: Set comfort level
      </Text>
    </View>
  );
}
