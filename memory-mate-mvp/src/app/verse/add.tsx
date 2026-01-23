import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

export default function AddVerseScreen() {
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <View className="mb-6">
        <Text className="text-xl font-bold text-gray-800 mb-2">
          Add New Verse
        </Text>
        <Text className="text-gray-500 text-sm">
          Supports UC-1.1: Add a verse to your collection
        </Text>
      </View>

      <View className="mb-6">
        <Text className="text-gray-700 font-semibold mb-2">Verse Reference</Text>
        <TextInput
          placeholder="e.g., John 3:16"
          className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
          placeholderTextColor="#9ca3af"
        />
      </View>

      <View className="mb-6">
        <Text className="text-gray-700 font-semibold mb-2">Verse Text</Text>
        <TextInput
          placeholder="Paste the verse text here..."
          multiline
          numberOfLines={6}
          className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
          placeholderTextColor="#9ca3af"
          textAlignVertical="top"
        />
      </View>

      <View className="mb-6">
        <Text className="text-gray-700 font-semibold mb-2">Translation</Text>
        <TextInput
          placeholder="e.g., NIV, KJV, ESV"
          className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
          placeholderTextColor="#9ca3af"
        />
      </View>

      <View className="flex-row gap-4 mt-8">
        <Pressable
          onPress={() => router.back()}
          className="flex-1 bg-gray-300 p-4 rounded-lg items-center active:bg-gray-400"
        >
          <Text className="text-gray-800 font-semibold">Cancel</Text>
        </Pressable>
        <Pressable
          onPress={() => router.back()}
          className="flex-1 bg-blue-600 p-4 rounded-lg items-center active:bg-blue-700"
        >
          <Text className="text-white font-semibold">Save Verse</Text>
        </Pressable>
      </View>

      <Text className="text-xs text-gray-400 text-center mt-6">
        Form validation and data persistence coming in Phase 4
      </Text>
    </ScrollView>
  );
}
