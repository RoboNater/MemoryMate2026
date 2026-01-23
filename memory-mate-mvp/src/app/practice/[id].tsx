import { View, Text, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

export default function PracticeVerseScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [revealed, setRevealed] = useState(false);

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4">
        <View className="mb-6">
          <Text className="text-sm text-gray-600 mb-2">
            Supports UC-2.2: Practice verse | UC-2.3: Set comfort level
          </Text>
        </View>

        <View className="bg-blue-50 p-6 rounded-lg border-2 border-blue-300 mb-6 items-center">
          <Text className="text-lg text-gray-600 mb-2">Verse Reference</Text>
          <Text className="text-3xl font-bold text-blue-600 text-center">
            John 3:16
          </Text>
        </View>

        {!revealed ? (
          <View className="mb-6">
            <Pressable
              onPress={() => setRevealed(true)}
              className="bg-green-600 p-6 rounded-lg items-center active:bg-green-700"
            >
              <Text className="text-white font-bold text-lg">
                Reveal Verse
              </Text>
            </Pressable>
          </View>
        ) : (
          <View className="mb-6 bg-green-50 p-4 rounded-lg border border-green-200">
            <Text className="text-gray-700 text-base leading-relaxed mb-4">
              For God so loved the world that he gave his one and only Son, that
              whoever believes in him shall not perish but have eternal life.
            </Text>
            <Text className="text-sm text-gray-600">Translation: NIV</Text>
          </View>
        )}

        <View className="mb-6 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <Text className="text-gray-700 font-semibold mb-3">
            How comfortable are you with this verse?
          </Text>
          <View className="flex-row gap-2">
            {[1, 2, 3, 4, 5].map((level) => (
              <Pressable
                key={level}
                className="flex-1 bg-yellow-300 p-3 rounded-lg items-center active:bg-yellow-400"
              >
                <Text className="font-bold text-gray-800">{level}</Text>
              </Pressable>
            ))}
          </View>
          <Text className="text-xs text-gray-600 mt-2 text-center">
            1 = Struggling | 5 = Very Comfortable
          </Text>
        </View>

        <View className="space-y-3">
          <Pressable
            onPress={() => router.push(`/practice/${Number(id) + 1}`)}
            className="bg-green-600 p-4 rounded-lg items-center active:bg-green-700"
          >
            <Text className="text-white font-semibold">Next Verse</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(tabs)/practice')}
            className="bg-gray-300 p-4 rounded-lg items-center active:bg-gray-400"
          >
            <Text className="text-gray-800 font-semibold">Done Practicing</Text>
          </Pressable>
        </View>

        <Text className="text-xs text-gray-400 text-center mt-8">
          Practice flow and progress tracking coming in Phase 4
        </Text>
      </View>
    </ScrollView>
  );
}
