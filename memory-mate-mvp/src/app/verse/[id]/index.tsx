import { View, Text, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, Link } from 'expo-router';

export default function VerseDetailScreen() {
  const { id } = useLocalSearchParams();

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4">
        <View className="mb-6 pb-4 border-b border-gray-200">
          <Text className="text-2xl font-bold text-gray-800 mb-2">
            John 3:16
          </Text>
          <Text className="text-gray-500 mb-3">
            Translation: NIV
          </Text>
          <Text className="text-gray-700 text-base leading-relaxed">
            For God so loved the world that he gave his one and only Son, that
            whoever believes in him shall not perish but have eternal life.
          </Text>
        </View>

        <View className="mb-6">
          <Text className="text-sm text-gray-600 mb-2">
            Supports UC-1.3: View verse details | UC-1.4: Edit | UC-1.5: Archive | UC-1.7: Delete
          </Text>
        </View>

        <View className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
          <Text className="text-gray-700 font-semibold mb-2">Progress Stats</Text>
          <Text className="text-sm text-gray-600">
            Times Practiced: 5 | Times Tested: 3 | Accuracy: 80%
          </Text>
          <Text className="text-xs text-gray-500 mt-2">
            (Mock data - real stats coming in Phase 3)
          </Text>
        </View>

        <View className="mb-6 bg-green-50 p-4 rounded-lg border border-green-200">
          <Text className="text-gray-700 font-semibold mb-2">Test History</Text>
          <Text className="text-sm text-gray-600">
            Last Tested: 2 days ago (PASS)
          </Text>
          <Text className="text-xs text-gray-500 mt-2">
            (Mock data - coming in Phase 3)
          </Text>
        </View>

        <View className="space-y-3">
          <Link href={`/verse/${id}/edit`} asChild>
            <Pressable className="bg-blue-600 p-4 rounded-lg items-center active:bg-blue-700">
              <Text className="text-white font-semibold">Edit Verse</Text>
            </Pressable>
          </Link>

          <Pressable className="bg-yellow-600 p-4 rounded-lg items-center active:bg-yellow-700">
            <Text className="text-white font-semibold">Archive Verse</Text>
          </Pressable>

          <Pressable className="bg-red-600 p-4 rounded-lg items-center active:bg-red-700">
            <Text className="text-white font-semibold">Delete Verse</Text>
          </Pressable>
        </View>

        <Text className="text-xs text-gray-400 text-center mt-8">
          UC-1.3: View details | UC-4.2: View verse stats
        </Text>
      </View>
    </ScrollView>
  );
}
