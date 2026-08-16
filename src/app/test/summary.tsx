import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ErrorDisplay, TestResultBadge } from '@/components';
import { useVerseStore } from '@/store';
import { decodeTestOutcomes, summarizeTestOutcomes } from '@/utils/testSession';

export default function TestSummaryScreen() {
  const { ids, results } = useLocalSearchParams<{ ids: string; results?: string }>();
  const router = useRouter();
  const { verses } = useVerseStore();

  // Parse session parameters
  const verseIds = ids ? ids.split(',') : [];

  // Get verses that were in this session
  const sessionVerses = verseIds
    .map(id => verses.find(v => v.id === id))
    .filter((v): v is typeof verses[0] => v !== undefined);

  // Indexed the same way test/session.tsx encoded them: one outcome per
  // still-valid verse, in session order.
  const outcomes = decodeTestOutcomes(results, sessionVerses.length);
  const summary = summarizeTestOutcomes(outcomes);

  // Validation
  if (!ids || verseIds.length === 0) {
    return (
      <ErrorDisplay message="Invalid session. Please start a new test session." />
    );
  }

  if (sessionVerses.length === 0) {
    return (
      <ErrorDisplay message="No verses found in session." />
    );
  }

  const handleTestAgain = () => {
    router.push(`/test/session?ids=${ids}&index=0`);
  };

  const handleDone = () => {
    router.push('/(tabs)/test');
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-purple-500 p-6 pb-8">
        <View className="items-center mb-4">
          <Text className="text-5xl mb-4">✓</Text>
          <Text className="text-3xl font-bold text-white mb-2">Test Complete!</Text>
        </View>
        <Text className="text-purple-100 text-center text-lg">
          You tested {sessionVerses.length} verse{sessionVerses.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <View className="p-6 -mt-6">
        {/* Session Statistics */}
        <View className="bg-white rounded-lg p-6 mb-6 border border-gray-200 shadow-sm">
          <Text className="text-lg font-bold text-gray-900 mb-4">Session Stats</Text>
          <View className="gap-3">
            <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
              <Text className="text-gray-700">Verses tested</Text>
              <Text className="text-lg font-bold text-purple-600">{summary.tested}</Text>
            </View>
            <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
              <Text className="text-gray-700">Passed</Text>
              <Text className="text-lg font-bold text-green-600">{summary.passed}</Text>
            </View>
            <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
              <Text className="text-gray-700">Failed</Text>
              <Text className="text-lg font-bold text-red-600">{summary.failed}</Text>
            </View>
            {summary.skipped > 0 && (
              <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
                <Text className="text-gray-700">Skipped</Text>
                <Text className="text-lg font-bold text-gray-600">{summary.skipped}</Text>
              </View>
            )}
            {summary.unsaved > 0 && (
              <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
                <Text className="text-gray-700">Not recorded</Text>
                <Text className="text-lg font-bold text-amber-600">{summary.unsaved}</Text>
              </View>
            )}
            {summary.accuracy !== null && (
              <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
                <Text className="text-gray-700">Accuracy</Text>
                <Text className="text-lg font-bold text-purple-600">{summary.accuracy}%</Text>
              </View>
            )}
            {summary.averageScore !== null && (
              <View className="flex-row items-center justify-between py-2">
                <Text className="text-gray-700">Average word-match score</Text>
                <Text className="text-lg font-bold text-purple-600">{summary.averageScore}%</Text>
              </View>
            )}
          </View>
        </View>

        {summary.unsaved > 0 && (
          <View className="mb-6 bg-amber-50 p-4 rounded-lg border border-amber-200">
            <Text className="text-amber-900 font-medium mb-1">
              Some results couldn't be saved
            </Text>
            <Text className="text-amber-700 text-sm">
              {summary.unsaved} result{summary.unsaved !== 1 ? 's' : ''} could not be saved to
              this device and {summary.unsaved !== 1 ? "weren't" : "wasn't"} added to those
              verses' history. They're excluded from the stats above.
            </Text>
          </View>
        )}

        {/* Verse Summary Cards */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-900 mb-4">Verses Tested</Text>
          <View className="gap-3">
            {sessionVerses.map((verse, i) => {
              const outcome = outcomes[i];
              const graded = outcome && (outcome.outcome === 'pass' || outcome.outcome === 'fail');

              return (
                <View
                  key={verse.id}
                  className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm"
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      <Text className="text-base font-bold text-gray-900">
                        {verse.reference}
                      </Text>
                      <Text className="text-xs text-gray-500 mt-1">
                        {verse.translation}
                      </Text>
                    </View>
                    {graded ? (
                      <View className="flex-row items-center gap-2">
                        <TestResultBadge
                          passed={outcome.outcome === 'pass'}
                          score={outcome.score !== null ? outcome.score / 100 : undefined}
                        />
                        {!outcome.saved && (
                          <View className="bg-amber-100 px-2 py-0.5 rounded-full">
                            <Text className="text-amber-700 font-semibold text-xs">
                              Not recorded
                            </Text>
                          </View>
                        )}
                      </View>
                    ) : (
                      <View className="bg-gray-100 px-3 py-1 rounded-full">
                        <Text className="text-gray-600 font-semibold text-xs">Skipped</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Action Buttons */}
        <View className="gap-3 mb-6">
          <TouchableOpacity
            onPress={handleTestAgain}
            className="bg-purple-500 py-4 rounded-lg items-center"
          >
            <Text className="text-white font-semibold text-base">Test Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDone}
            className="bg-gray-200 py-4 rounded-lg items-center"
          >
            <Text className="text-gray-700 font-semibold text-base">Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
