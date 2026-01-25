import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LoadingSpinner } from '@/components';
import { useVerseStore } from '@/store';

export default function TestScreen() {
  const router = useRouter();
  const { isLoading, getActiveVerses, getVersesReadyForTest, progress } = useVerseStore();
  const activeVerses = getActiveVerses();
  const versesReady = getVersesReadyForTest();

  if (isLoading) {
    return <LoadingSpinner message="Loading verses..." />;
  }

  // For multi-verse tests, we'll just navigate to the first verse
  // In Phase 4, we can implement a proper test session manager
  const startTest = (verses: typeof activeVerses) => {
    if (verses.length === 0) return;
    router.push(`/test/${verses[0].id}`);
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-purple-500 p-6 pb-8">
        <Text className="text-3xl font-bold text-white mb-2">Test</Text>
        <Text className="text-purple-100">Evaluate your memorization progress</Text>
      </View>

      <View className="p-6 -mt-6">
        {activeVerses.length === 0 ? (
          <View className="bg-white rounded-lg p-8 items-center border border-gray-200">
            <Text className="text-xl font-bold text-gray-900 mb-2">No Verses Yet</Text>
            <Text className="text-gray-600 text-center mb-6">
              Add some verses to your collection to start testing
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/verse/add')}
              className="bg-blue-500 px-6 py-3 rounded-lg"
            >
              <Text className="text-white font-semibold">Add Your First Verse</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="gap-4">
            {/* Test All Verses */}
            <TouchableOpacity
              onPress={() => startTest(activeVerses)}
              className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm"
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xl font-bold text-gray-900">Test All</Text>
                <View className="bg-purple-100 px-3 py-1 rounded-full">
                  <Text className="text-purple-700 font-semibold">
                    {activeVerses.length} verses
                  </Text>
                </View>
              </View>
              <Text className="text-gray-600 mb-4">
                Test all active verses in your collection
              </Text>
              <View className="bg-purple-500 py-3 rounded-lg items-center">
                <Text className="text-white font-semibold">Start Test</Text>
              </View>
            </TouchableOpacity>

            {/* Test Ready Verses */}
            {versesReady.length > 0 && (
              <TouchableOpacity
                onPress={() => startTest(versesReady)}
                className="bg-white rounded-lg p-6 border border-green-200 shadow-sm"
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-xl font-bold text-gray-900">Ready to Test</Text>
                  <View className="bg-green-100 px-3 py-1 rounded-full">
                    <Text className="text-green-700 font-semibold">
                      {versesReady.length} verses
                    </Text>
                  </View>
                </View>
                <Text className="text-gray-600 mb-4">
                  Test verses at comfort level 3 or higher
                </Text>
                <View className="bg-green-500 py-3 rounded-lg items-center">
                  <Text className="text-white font-semibold">Test These</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Individual Verses */}
            <View className="bg-white rounded-lg p-6 border border-gray-200">
              <Text className="text-lg font-bold text-gray-900 mb-4">
                Or choose a specific verse
              </Text>
              <View className="gap-2">
                {activeVerses.slice(0, 5).map((verse) => {
                  const prog = progress[verse.id];
                  const accuracy =
                    prog && prog.times_tested > 0
                      ? Math.round((prog.times_correct / prog.times_tested) * 100)
                      : null;

                  return (
                    <TouchableOpacity
                      key={verse.id}
                      onPress={() => router.push(`/test/${verse.id}`)}
                      className="flex-row items-center justify-between py-3 border-b border-gray-100"
                    >
                      <View className="flex-1">
                        <Text className="font-semibold text-gray-900">
                          {verse.reference}
                        </Text>
                        <Text className="text-xs text-gray-500 mt-0.5">
                          {verse.translation}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-3">
                        {prog && prog.times_tested > 0 && (
                          <Text className="text-sm font-semibold text-gray-700">
                            {accuracy}%
                          </Text>
                        )}
                        {prog && (
                          <Text className="text-xs text-gray-500">
                            {prog.times_tested} tests
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {activeVerses.length > 5 && (
                  <Text className="text-xs text-gray-500 text-center mt-2">
                    + {activeVerses.length - 5} more verses
                  </Text>
                )}
              </View>
            </View>

            {/* Test Info */}
            <View className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <Text className="text-blue-900 font-semibold mb-2">About Testing</Text>
              <Text className="text-blue-700 text-sm">
                Testing helps you measure your memorization progress. Try to type the verse
                from memory, then compare it with the original.
              </Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
