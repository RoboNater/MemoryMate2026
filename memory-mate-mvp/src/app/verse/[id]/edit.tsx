import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function EditVerseScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <View className="mb-6">
        <Text className="text-xl font-bold text-gray-800 mb-2">
          Edit Verse
        </Text>
        <Text className="text-gray-500 text-sm">
          Supports UC-1.4: Edit verse details
        </Text>
      </View>

      <View className="mb-6">
        <Text className="text-gray-700 font-semibold mb-2">Verse Reference</Text>
        <TextInput
          defaultValue="John 3:16"
          className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
          placeholderTextColor="#9ca3af"
        />
      </View>

      <View className="mb-6">
        <Text className="text-gray-700 font-semibold mb-2">Verse Text</Text>
        <TextInput
          defaultValue="For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life."
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
          defaultValue="NIV"
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
          <Text className="text-white font-semibold">Save Changes</Text>
        </Pressable>
      </View>

      <Text className="text-xs text-gray-400 text-center mt-6">
        Form validation and data persistence coming in Phase 4
      </Text>
    </ScrollView>
  );
}
