import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { VerseTest } from '@/components';
import { useVerseStore } from '@/store';

export default function TestVerseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { verses, progress, recordTestResult } = useVerseStore();
  const verse = verses.find((v) => v.id === id);
  const verseProgress = verse ? progress[verse.id] : undefined;

  // Whether a pass/fail choice has actually been recorded -- VerseTest owns
  // the in-progress typing/checking state, so this is the one bit of it the
  // screen needs to gate the Done button.
  const [resultMarked, setResultMarked] = useState(false);

  if (!verse) {
    return (
      <View className="flex-1 bg-white items-center justify-center p-6">
        <Text className="text-xl font-bold text-gray-900 mb-2">Verse Not Found</Text>
        <Text className="text-gray-600 text-center">
          The verse you're trying to test doesn't exist.
        </Text>
      </View>
    );
  }

  const handleMarkResult = async (passed: boolean, score: number | null) => {
    setResultMarked(true);
    try {
      // TestResult.score and TestResultBadge are both 0.0-1.0; VerseTest
      // reports the 0-100 word-match percentage, so convert here.
      await recordTestResult(verse.id, passed, score === null ? undefined : score / 100);
    } catch {
      Alert.alert('Error', 'Failed to record test result. Please try again.', [{ text: 'OK' }]);
    }
  };

  const handleDone = () => {
    if (!resultMarked) {
      Alert.alert('Please mark as Pass or Fail', 'Did you pass this test?');
      return;
    }
    router.push('/(tabs)/test');
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <VerseTest
        verse={verse}
        verseProgress={verseProgress}
        onMarkResult={handleMarkResult}
        onCancel={() => router.back()}
        footer={
          <TouchableOpacity
            onPress={handleDone}
            className="bg-purple-500 py-4 rounded-lg items-center"
          >
            <Text className="text-white font-semibold text-base">
              {resultMarked ? 'Save & Finish' : 'Finish Test'}
            </Text>
          </TouchableOpacity>
        }
      />
    </ScrollView>
  );
}
