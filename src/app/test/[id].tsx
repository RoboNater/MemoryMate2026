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

  // How the user graded the verse. VerseTest owns the in-progress
  // typing/checking state; this is the one piece of it the screen needs, to
  // gate the Done button and to write on the way out.
  const [outcome, setOutcome] = useState<{ passed: boolean; score: number | null } | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);

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

  // Marking only records the grade; the write happens on the way out, as it
  // does in test/session.tsx. That keeps one row per test however many times
  // the user changes their mind, and lets Give Up stand as a fail here
  // without a second tap writing the same result twice.
  const handleMarkResult = (passed: boolean, score: number | null) => {
    setOutcome({ passed, score });
  };

  const handleDone = async () => {
    if (!outcome) {
      Alert.alert('Please mark as Pass or Fail', 'Did you pass this test?');
      return;
    }

    try {
      setIsSaving(true);
      // TestResult.score and TestResultBadge are both 0.0-1.0; VerseTest
      // reports the 0-100 word-match percentage, so convert here.
      await recordTestResult(
        verse.id,
        outcome.passed,
        outcome.score === null ? undefined : outcome.score / 100
      );
    } catch {
      // Say plainly that it didn't count, rather than leaving with a
      // "Save & Finish" that saved nothing. There is no session left to
      // carry the failure into here, so the user is not held on the screen.
      Alert.alert(
        'Not recorded',
        "This result couldn't be saved to your device, so it won't count towards this verse's history.",
        [{ text: 'OK' }]
      );
    } finally {
      setIsSaving(false);
    }

    router.push('/(tabs)/test');
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <VerseTest
        verse={verse}
        verseProgress={verseProgress}
        onMarkResult={handleMarkResult}
        onGiveUp={() => handleMarkResult(false, null)}
        onCancel={() => router.back()}
        footer={
          <TouchableOpacity
            onPress={handleDone}
            disabled={isSaving}
            className="bg-purple-500 py-4 rounded-lg items-center"
          >
            <Text className="text-white font-semibold text-base">
              {outcome ? 'Save & Finish' : 'Finish Test'}
            </Text>
          </TouchableOpacity>
        }
      />
    </ScrollView>
  );
}
