import { View, Text } from 'react-native';

export default function SettingsScreen() {
  return (
    <View className="flex-1 bg-white p-4">
      <View className="mb-6">
        <Text className="text-2xl font-bold text-gray-800 mb-2">
          Settings
        </Text>
        <Text className="text-gray-500 text-sm">
          App preferences and configuration
        </Text>
      </View>

      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-400 italic mb-8">
          Settings options coming in Phase 3...
        </Text>
      </View>

      <View className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <Text className="text-gray-600 text-sm">
          Planned settings:
        </Text>
        <Text className="text-gray-500 text-xs mt-2">• App theme (light/dark)</Text>
        <Text className="text-gray-500 text-xs">• Notification preferences</Text>
        <Text className="text-gray-500 text-xs">• Data export/import</Text>
        <Text className="text-gray-500 text-xs">• About app</Text>
      </View>
    </View>
  );
}
