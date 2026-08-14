import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ErrorDisplay } from '@/components';
import { useVerseStore } from '@/store';

export default function PracticeSummaryScreen() {
  const { ids } = useLocalSearchParams<{ ids: string }>();
  const router = useRouter();
  const { verses, progress } = useVerseStore();

  // Parse session parameters
  const verseIds = ids ? ids.split(',') : [];

  // Get verses that were in this session
  const sessionVerses = verseIds
    .map(id => verses.find(v => v.id === id))
    .filter((v): v is typeof verses[0] => v !== undefined);

  // Calculate average comfort level
  const calculateAverageComfort = () => {
    const comfortLevels = sessionVerses
      .map(v => progress[v.id]?.comfort_level || 1)
      .filter(Boolean);

    if (comfortLevels.length === 0) return 0;
    return comfortLevels.reduce((a, b) => a + b, 0) / comfortLevels.length;
  };

  const averageComfortValue = calculateAverageComfort();
  const averageComfort = averageComfortValue.toFixed(1);
  const averageComfortRounded = Math.round(averageComfortValue);

  // Validation
  if (!ids || verseIds.length === 0) {
    return (
      <ErrorDisplay message="Invalid session. Please start a new practice session." />
    );
  }

  if (sessionVerses.length === 0) {
    return (
      <ErrorDisplay message="No verses found in session." />
    );
  }

  const handlePracticeAgain = () => {
    router.push(`/practice/session?ids=${ids}&index=0`);
  };

  const handleDone = () => {
    router.push('/(tabs)/practice');
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Success Header */}
      <View className="bg-green-500 p-6 pb-8">
        <View className="items-center mb-4">
          <Text className="text-5xl mb-4">✓</Text>
          <Text className="text-3xl font-bold text-white mb-2">Practice Complete!</Text>
        </View>
        <Text className="text-green-100 text-center text-lg">
          You practiced {sessionVerses.length} verse{sessionVerses.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <View className="p-6 -mt-6">
        {/* Session Statistics */}
        <View className="bg-white rounded-lg p-6 mb-6 border border-gray-200 shadow-sm">
          <Text className="text-lg font-bold text-gray-900 mb-4">Session Stats</Text>
          <View className="gap-3">
            <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
              <Text className="text-gray-700">Total verses practiced</Text>
              <Text className="text-lg font-bold text-green-600">{sessionVerses.length}</Text>
            </View>
            <View className="flex-row items-center justify-between py-2">
              <Text className="text-gray-700">Average comfort level</Text>
              <View className="flex-row items-center gap-2">
                <Text className="text-lg font-bold text-green-600">{averageComfort}</Text>
                <View className="flex-row gap-1">
                  {[1, 2, 3, 4, 5].map(level => (
                    <View
                      key={level}
                      className={`w-3 h-3 rounded-full ${
                        level <= averageComfortRounded
                          ? 'bg-yellow-400'
                          : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Verse Summary Cards */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-900 mb-4">Verses Practiced</Text>
          <View className="gap-3">
            {sessionVerses.map((verse) => {
              const prog = progress[verse.id];
              const comfortLevel = prog?.comfort_level || 1;

              return (
                <View
                  key={verse.id}
                  className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm"
                >
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1">
                      <Text className="text-base font-bold text-gray-900">
                        {verse.reference}
                      </Text>
                      <Text className="text-xs text-gray-500 mt-1">
                        {verse.translation}
                      </Text>
                    </View>
                    <View className="bg-green-100 px-3 py-1 rounded-full">
                      <Text className="text-green-700 font-semibold text-xs">
                        Level {comfortLevel}
                      </Text>
                    </View>
                  </View>

                  {/* Comfort Level Visual */}
                  <View className="flex-row gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map(level => (
                      <View
                        key={level}
                        className={`flex-1 h-2 rounded-full ${
                          level <= comfortLevel ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </View>

                  {/* Practice Count */}
                  <Text className="text-xs text-gray-500">
                    Total practiced: {prog?.times_practiced || 0} time{prog?.times_practiced !== 1 ? 's' : ''}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Action Buttons */}
        <View className="gap-3 mb-6">
          <TouchableOpacity
            onPress={handlePracticeAgain}
            className="bg-green-500 py-4 rounded-lg items-center"
          >
            <Text className="text-white font-semibold text-base">Practice Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDone}
            className="bg-gray-200 py-4 rounded-lg items-center"
          >
            <Text className="text-gray-700 font-semibold text-base">Done</Text>
          </TouchableOpacity>
        </View>

        {/* Encouragement */}
        <View className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
          <Text className="text-blue-900 font-semibold mb-2 text-center">
            Keep it up!
          </Text>
          <Text className="text-blue-700 text-sm text-center">
            Regular practice is the key to memorization. Come back soon to practice again.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
