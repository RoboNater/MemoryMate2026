import { View, Text, ScrollView } from 'react-native';

export default function SettingsScreen() {
  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-gray-700 p-6 pb-8">
        <Text className="text-3xl font-bold text-white mb-2">Settings</Text>
        <Text className="text-gray-300">App preferences and information</Text>
      </View>

      <View className="p-6 -mt-6">
        {/* App Info */}
        <View className="bg-white rounded-lg p-6 mb-4 border border-gray-200">
          <Text className="text-xl font-bold text-gray-900 mb-4">About Memory Mate</Text>
          <View className="gap-3">
            <View>
              <Text className="text-sm text-gray-600">Version</Text>
              <Text className="text-base font-semibold text-gray-900">MVP 1.0.0</Text>
            </View>
            <View>
              <Text className="text-sm text-gray-600">Status</Text>
              <View className="bg-blue-100 px-3 py-1 rounded-full self-start mt-1">
                <Text className="text-blue-700 text-sm font-semibold">Phase 3 Complete</Text>
              </View>
            </View>
            <View>
              <Text className="text-sm text-gray-600">Description</Text>
              <Text className="text-base text-gray-700 mt-1">
                Memory Mate helps you memorize Bible verses through practice and testing.
                Track your progress and build your memorization skills.
              </Text>
            </View>
          </View>
        </View>

        {/* Current Features */}
        <View className="bg-white rounded-lg p-6 mb-4 border border-gray-200">
          <Text className="text-lg font-bold text-gray-900 mb-3">Current Features</Text>
          <View className="gap-2">
            <View className="flex-row items-center">
              <Text className="text-green-500 text-lg mr-2">✓</Text>
              <Text className="text-gray-700">Verse management (add, edit, archive, delete)</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-green-500 text-lg mr-2">✓</Text>
              <Text className="text-gray-700">Practice mode with comfort tracking</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-green-500 text-lg mr-2">✓</Text>
              <Text className="text-gray-700">Test mode with scoring</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-green-500 text-lg mr-2">✓</Text>
              <Text className="text-gray-700">Progress statistics and tracking</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-green-500 text-lg mr-2">✓</Text>
              <Text className="text-gray-700">Interactive UI prototype</Text>
            </View>
          </View>
        </View>

        {/* Coming Soon */}
        <View className="bg-white rounded-lg p-6 mb-4 border border-gray-200">
          <Text className="text-lg font-bold text-gray-900 mb-3">Coming in Phase 4</Text>
          <View className="gap-2">
            <View className="flex-row items-center">
              <Text className="text-amber-500 text-lg mr-2">○</Text>
              <Text className="text-gray-600">SQLite data persistence</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-amber-500 text-lg mr-2">○</Text>
              <Text className="text-gray-600">Zustand state management</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-amber-500 text-lg mr-2">○</Text>
              <Text className="text-gray-600">Real data layer integration</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-amber-500 text-lg mr-2">○</Text>
              <Text className="text-gray-600">Data persistence across app restarts</Text>
            </View>
          </View>
        </View>

        {/* Future Settings */}
        <View className="bg-white rounded-lg p-6 border border-gray-200">
          <Text className="text-lg font-bold text-gray-900 mb-3">Planned Settings</Text>
          <View className="gap-2">
            <View className="flex-row items-center">
              <Text className="text-gray-400 text-lg mr-2">○</Text>
              <Text className="text-gray-500">App theme (light/dark mode)</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-gray-400 text-lg mr-2">○</Text>
              <Text className="text-gray-500">Practice reminders</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-gray-400 text-lg mr-2">○</Text>
              <Text className="text-gray-500">Data export/import</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-gray-400 text-lg mr-2">○</Text>
              <Text className="text-gray-500">Backup and restore</Text>
            </View>
          </View>
        </View>

        {/* Note */}
        <View className="bg-blue-50 p-4 rounded-lg border border-blue-100 mt-4">
          <Text className="text-blue-900 font-semibold mb-2 text-center">
            Interactive Prototype
          </Text>
          <Text className="text-blue-700 text-sm text-center">
            You're using an interactive prototype with mock data. Data persistence will be
            added in Phase 4.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
