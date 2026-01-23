import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

export default function TestVerseScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [showResult, setShowResult] = useState(false);

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4">
        <View className="mb-6">
          <Text className="text-sm text-gray-600 mb-2">
            Supports UC-3.2: Take test | UC-3.3: View results
          </Text>
        </View>

        <View className="bg-purple-50 p-6 rounded-lg border-2 border-purple-300 mb-6 items-center">
          <Text className="text-lg text-gray-600 mb-2">Verse Reference</Text>
          <Text className="text-3xl font-bold text-purple-600 text-center">
            John 3:16
          </Text>
        </View>

        <View className="mb-6">
          <Text className="text-gray-700 font-semibold mb-2">
            Type the verse from memory:
          </Text>
          <TextInput
            placeholder="Enter the verse text here..."
            multiline
            numberOfLines={6}
            editable={!showResult}
            className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
            placeholderTextColor="#9ca3af"
            textAlignVertical="top"
          />
        </View>

        {!showResult ? (
          <View className="space-y-3 mb-6">
            <Pressable
              onPress={() => setShowResult(true)}
              className="bg-blue-600 p-4 rounded-lg items-center active:bg-blue-700"
            >
              <Text className="text-white font-semibold">Check Answer</Text>
            </Pressable>

            <Pressable
              onPress={() => setShowResult(true)}
              className="bg-gray-400 p-4 rounded-lg items-center active:bg-gray-500"
            >
              <Text className="text-white font-semibold">Give Up</Text>
            </Pressable>
          </View>
        ) : (
          <View className="mb-6">
            <View className="bg-green-50 p-4 rounded-lg border border-green-200 mb-4">
              <Text className="text-gray-700 font-semibold mb-2">Correct Answer:</Text>
              <Text className="text-gray-700 text-base leading-relaxed">
                For God so loved the world that he gave his one and only Son, that
                whoever believes in him shall not perish but have eternal life.
              </Text>
            </View>

            <View className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
              <Text className="text-gray-700 font-semibold mb-2">Comparison:</Text>
              <Text className="text-sm text-gray-600">
                Word match: 18/32 words correct (56%)
              </Text>
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-3">Did you pass?</Text>
              <View className="flex-row gap-2">
                <Pressable className="flex-1 bg-green-600 p-4 rounded-lg items-center active:bg-green-700">
                  <Text className="text-white font-semibold">Pass</Text>
                </Pressable>
                <Pressable className="flex-1 bg-red-600 p-4 rounded-lg items-center active:bg-red-700">
                  <Text className="text-white font-semibold">Fail</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        <Pressable
          onPress={() => router.back()}
          className="bg-gray-300 p-4 rounded-lg items-center active:bg-gray-400"
        >
          <Text className="text-gray-800 font-semibold">
            {showResult ? 'Next Verse' : 'Cancel'}
          </Text>
        </Pressable>

        <Text className="text-xs text-gray-400 text-center mt-8">
          Comparison logic and scoring coming in Phase 5
        </Text>
      </View>
    </ScrollView>
  );
}
