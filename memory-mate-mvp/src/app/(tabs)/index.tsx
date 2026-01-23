import { View, Text } from 'react-native';

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white p-4">
      <Text className="text-2xl font-bold text-blue-600 mb-4">
        Memory Mate
      </Text>
      <Text className="text-gray-600 mb-8">
        Dashboard & Quick Actions
      </Text>

      <Text className="text-gray-500 italic mb-12 text-center">
        Supports UC-4.1: View overall statistics
      </Text>

      <View className="w-full max-w-xs space-y-4">
        <View className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <Text className="text-gray-600 text-sm mb-1">Stats will appear here</Text>
          <Text className="text-blue-600 text-lg font-bold">Coming in Phase 3</Text>
        </View>
      </View>
    </View>
  );
}
