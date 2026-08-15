import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ConfirmDialog, ErrorDisplay, VerseTest } from '@/components';
import { useVerseStore } from '@/store';
import { decodeTestOutcomes, setTestOutcomeAt, VerseTestOutcome } from '@/utils/testSession';

export default function TestSessionScreen() {
  const { ids, index, results } = useLocalSearchParams<{
    ids: string;
    index: string;
    results?: string;
  }>();
  const router = useRouter();
  const { verses, progress, recordTestResult } = useVerseStore();

  // Parse session parameters
  const verseIds = ids ? ids.split(',') : [];
  const currentIndex = parseInt(index || '0', 10);
  // Preserved across every navigation within the session.
  const sessionQuery = `ids=${ids}`;

  // Filter to only valid verses (handles deleted verses during session)
  const validVerseIds = verseIds.filter(id => verses.find(v => v.id === id));
  const currentVerseId = validVerseIds[currentIndex];
  const verse = currentVerseId ? verses.find(v => v.id === currentVerseId) : undefined;
  const verseProgress = verse ? progress[verse.id] : undefined;

  // The current verse's outcome once the user marks pass/fail (or gives up).
  // Reset whenever the session moves to a different verse -- otherwise it
  // would leak into the next verse's Next/Skip label.
  const [currentOutcome, setCurrentOutcome] = useState<VerseTestOutcome | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);

  // Validation: Check for valid session
  if (!ids || verseIds.length === 0) {
    return (
      <ErrorDisplay message="Invalid session. Please start a new test session." />
    );
  }

  if (validVerseIds.length === 0) {
    return (
      <ErrorDisplay message="No valid verses found in session. Some verses may have been deleted." />
    );
  }

  if (currentIndex < 0 || currentIndex >= validVerseIds.length) {
    return (
      <ErrorDisplay message="Invalid verse in session. Please start over." />
    );
  }

  if (!verse) {
    return (
      <ErrorDisplay message="Verse not found in your collection." />
    );
  }

  // What the session already recorded for this verse on an earlier visit --
  // the user can walk back through the set with Previous.
  const priorOutcome = decodeTestOutcomes(results, validVerseIds.length)[currentIndex];
  // What the Next button will write: this visit's mark, or the earlier one.
  const markedOutcome = currentOutcome ?? priorOutcome;
  // A verse that was skipped on an earlier visit still counts as unanswered,
  // so the button keeps reading "Skip" until it is actually graded.
  const isGraded = markedOutcome !== null && markedOutcome.outcome !== 'skipped';

  // Shared by an explicit Pass/Fail tap and a Give Up (which counts as a
  // fail). Marking only records the outcome; the write happens on the way
  // out, the way practice/session.tsx saves on Next. Persisting on every tap
  // would append a second `test_results` row each time the user changed
  // their mind between Pass and Fail, or gave up and then confirmed the Fail.
  const handleMarkResult = (passed: boolean, score: number | null) => {
    setCurrentOutcome({ outcome: passed ? 'pass' : 'fail', score });
  };

  const saveCurrentOutcome = async () => {
    if (!currentOutcome || currentOutcome.outcome === 'skipped') return;
    try {
      setIsSaving(true);
      // TestResult.score and TestResultBadge are both 0.0-1.0; VerseTest
      // reports the 0-100 word-match percentage, so convert here.
      await recordTestResult(
        verse.id,
        currentOutcome.outcome === 'pass',
        currentOutcome.score === null ? undefined : currentOutcome.score / 100
      );
    } catch {
      Alert.alert('Error', 'Failed to record test result. Please try again.', [{ text: 'OK' }]);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    // Only this visit's mark is written to the database; an outcome carried
    // over from an earlier visit is already recorded.
    await saveCurrentOutcome();

    // Nothing marked, on this visit or an earlier one -> the verse was
    // skipped, not tested; distinct from a verse the session never reached
    // at all (still `null` past this index).
    const outcome: VerseTestOutcome = markedOutcome ?? { outcome: 'skipped', score: null };
    const nextResults = setTestOutcomeAt(results, currentIndex, outcome, validVerseIds.length);

    const nextIndex = currentIndex + 1;

    if (nextIndex >= validVerseIds.length) {
      // End of session - go to summary
      router.push(`/test/summary?${sessionQuery}&results=${nextResults}`);
    } else {
      setCurrentOutcome(null);
      router.push(`/test/session?${sessionQuery}&results=${nextResults}&index=${nextIndex}`);
    }
  };

  const handlePrevious = () => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      setCurrentOutcome(null);
      const resultsQuery = results ? `&results=${results}` : '';
      router.push(`/test/session?${sessionQuery}${resultsQuery}&index=${prevIndex}`);
    }
  };

  // ConfirmDialog rather than a multi-button Alert.alert, whose button
  // onPress handlers never fire on React Native Web (the exit was a no-op
  // in the browser).
  const handleExitSession = () => {
    setShowExitDialog(true);
  };

  const confirmExitSession = () => {
    setShowExitDialog(false);
    router.push('/(tabs)/test');
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <ConfirmDialog
        visible={showExitDialog}
        title="Exit Test Session?"
        message="Your results have been saved for verses you completed."
        confirmText="Exit"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={confirmExitSession}
        onCancel={() => setShowExitDialog(false)}
      />

      {/* Session Progress Indicator */}
      <View className="bg-white p-4 border-b border-gray-200">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-lg font-semibold text-gray-900">
            Verse {currentIndex + 1} of {validVerseIds.length}
          </Text>
          <Text className="text-sm text-gray-600">
            {Math.round(((currentIndex + 1) / validVerseIds.length) * 100)}%
          </Text>
        </View>
        <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <View
            className="h-full bg-purple-500 rounded-full"
            style={{ width: `${((currentIndex + 1) / validVerseIds.length) * 100}%` }}
          />
        </View>
      </View>

      {/* Expo Router can reuse the mounted screen across a same-route push
          (only `index` changing), so `key` forces VerseTest to remount and
          reset its typing/result state per verse. */}
      <VerseTest
        key={verse.id}
        verse={verse}
        verseProgress={verseProgress}
        onMarkResult={handleMarkResult}
        onGiveUp={() => handleMarkResult(false, null)}
      />

      {/* Session Navigation Buttons */}
      <View className="flex-row gap-3 px-6 pb-6">
        {/* Previous */}
        <TouchableOpacity
          onPress={handlePrevious}
          disabled={currentIndex === 0}
          className={`flex-1 py-3 rounded-lg items-center ${
            currentIndex === 0 ? 'bg-gray-300' : 'bg-purple-500'
          }`}
        >
          <Text className={`font-semibold ${
            currentIndex === 0 ? 'text-gray-500' : 'text-white'
          }`}>
            ← Previous
          </Text>
        </TouchableOpacity>

        {/* Exit */}
        <TouchableOpacity
          onPress={handleExitSession}
          className="bg-gray-200 px-4 py-3 rounded-lg items-center justify-center"
        >
          <Text className="text-gray-700 font-medium">Exit</Text>
        </TouchableOpacity>

        {/* Next */}
        <TouchableOpacity
          onPress={handleNext}
          disabled={isSaving}
          className={`flex-1 py-3 rounded-lg items-center ${
            isGraded ? 'bg-purple-500' : 'bg-gray-400'
          }`}
        >
          <Text className="text-white font-semibold">
            {isGraded ? 'Next →' : 'Skip →'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
