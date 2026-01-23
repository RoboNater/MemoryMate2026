import { View, Text, Pressable } from 'react-native';
import { Link } from 'expo-router';

export default function TestScreen() {
  return (
    <View className="flex-1 bg-white p-4">
      <View className="mb-6">
        <Text className="text-2xl font-bold text-gray-800 mb-2">
          Test
        </Text>
        <Text className="text-gray-500 text-sm">
          Supports UC-3.1 & UC-3.2: Take test sessions
        </Text>
      </View>

      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-600 mb-6 text-center">
          Test your knowledge of memorized verses
        </Text>
        <Text className="text-gray-400 italic mb-8">
          Verse selection and test flow coming in Phase 3...
        </Text>
      </View>

      <Link href="/test/1" asChild>
        <Pressable className="bg-purple-600 p-4 rounded-lg items-center mb-4 active:bg-purple-700">
          <Text className="text-white font-semibold text-center">
            Start Test (Demo)
          </Text>
        </Pressable>
      </Link>

      <Text className="text-xs text-gray-400 text-center">
        UC-3.1: Start test | UC-3.2: Take test | UC-3.3: View results
      </Text>
    </View>
  );
}
