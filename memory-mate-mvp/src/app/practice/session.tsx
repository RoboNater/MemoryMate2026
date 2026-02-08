import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ComfortLevelPicker, ErrorDisplay } from '@/components';
import { useVerseStore } from '@/store';

export default function PracticeSessionScreen() {
  const { ids, index } = useLocalSearchParams<{ ids: string; index: string }>();
  const router = useRouter();
  const { verses, progress, recordPractice, setComfortLevel: setComfortLevelAction } = useVerseStore();

  // Parse session parameters
  const verseIds = ids ? ids.split(',') : [];
  const currentIndex = parseInt(index || '0', 10);

  // Filter to only valid verses (handles deleted verses during session)
  const validVerseIds = verseIds.filter(id => verses.find(v => v.id === id));
  const currentVerseId = validVerseIds[currentIndex];
  const verse = currentVerseId ? verses.find(v => v.id === currentVerseId) : undefined;
  const verseProgress = verse ? progress[verse.id] : undefined;

  // Local state for current verse practice
  const [revealed, setRevealed] = useState(false);
  const [comfortLevel, setComfortLevel] = useState<1 | 2 | 3 | 4 | 5>(
    verseProgress?.comfort_level || 1
  );
  const [isSaving, setIsSaving] = useState(false);

  // Validation: Check for valid session
  if (!ids || verseIds.length === 0) {
    return (
      <ErrorDisplay message="Invalid session. Please start a new practice session." />
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

  const handleSaveProgress = async () => {
    try {
      setIsSaving(true);
      await recordPractice(verse.id);
      await setComfortLevelAction(verse.id, comfortLevel);
    } catch (error) {
      Alert.alert('Error', 'Failed to save progress. Please try again.', [{ text: 'OK' }]);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    // Save progress for current verse if revealed
    if (revealed) {
      await handleSaveProgress();
    }

    const nextIndex = currentIndex + 1;

    if (nextIndex >= validVerseIds.length) {
      // End of session - go to summary
      router.push(`/practice/summary?ids=${ids}`);
    } else {
      // Navigate to next verse
      setRevealed(false);
      setComfortLevel(1);
      router.push(`/practice/session?ids=${ids}&index=${nextIndex}`);
    }
  };

  const handlePrevious = () => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      setRevealed(false);
      setComfortLevel(1);
      router.push(`/practice/session?ids=${ids}&index=${prevIndex}`);
    }
  };

  const handleExitSession = () => {
    Alert.alert(
      'Exit Practice Session?',
      'Your progress has been saved for verses you completed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: () => router.push('/(tabs)/practice')
        }
      ]
    );
  };

  return (
    <ScrollView className="flex-1 bg-white">
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
            className="h-full bg-green-500 rounded-full"
            style={{ width: `${((currentIndex + 1) / validVerseIds.length) * 100}%` }}
          />
        </View>
      </View>

      <View className="p-6">
        {/* Progress Indicator */}
        {verseProgress && (
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-sm text-gray-600">
              Practiced {verseProgress.times_practiced} times
            </Text>
            <View className="bg-blue-100 px-3 py-1 rounded-full">
              <Text className="text-blue-700 text-xs font-semibold">
                Level {verseProgress.comfort_level}
              </Text>
            </View>
          </View>
        )}

        {/* Verse Reference */}
        <View className="bg-gradient-to-r from-blue-50 to-blue-100 p-8 rounded-2xl mb-6 items-center border-2 border-blue-200 shadow-sm">
          <Text className="text-sm text-gray-600 mb-2 uppercase tracking-wide">
            Practice This Verse
          </Text>
          <Text className="text-3xl font-bold text-blue-700 text-center mb-1">
            {verse.reference}
          </Text>
          <Text className="text-sm text-blue-600">{verse.translation}</Text>
        </View>

        {/* Instructions */}
        {!revealed && (
          <View className="mb-6 bg-amber-50 p-4 rounded-lg border border-amber-200">
            <Text className="text-amber-900 font-medium mb-2">
              Try to recall the verse from memory
            </Text>
            <Text className="text-amber-700 text-sm">
              Take a moment to think about it, then tap "Reveal" to check your recall.
            </Text>
          </View>
        )}

        {/* Reveal Button or Verse Text */}
        {!revealed ? (
          <View className="mb-6">
            <TouchableOpacity
              onPress={() => setRevealed(true)}
              className="bg-green-500 p-6 rounded-xl items-center shadow-md active:bg-green-600"
            >
              <Text className="text-white font-bold text-lg">Reveal Verse</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="mb-6 bg-green-50 p-6 rounded-xl border-2 border-green-200">
            <Text className="text-gray-800 text-lg leading-8 mb-4">
              {verse.text}
            </Text>
            <View className="flex-row items-center justify-between pt-4 border-t border-green-200">
              <Text className="text-sm text-green-700 font-medium">
                {verse.translation}
              </Text>
              <Text className="text-xs text-gray-500">
                {verse.text.split(' ').length} words
              </Text>
            </View>
          </View>
        )}

        {/* Comfort Level Picker */}
        {revealed && (
          <View className="mb-8 bg-white p-6 rounded-xl border-2 border-gray-200 shadow-sm">
            <ComfortLevelPicker
              value={comfortLevel}
              onChange={setComfortLevel}
              label="How comfortable are you with this verse?"
              size="md"
            />
          </View>
        )}
      </View>

      {/* Session Navigation Buttons */}
      <View className="flex-row gap-3 px-6 pb-6">
        {/* Previous */}
        <TouchableOpacity
          onPress={handlePrevious}
          disabled={currentIndex === 0}
          className={`flex-1 py-3 rounded-lg items-center ${
            currentIndex === 0 ? 'bg-gray-300' : 'bg-blue-500'
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
            revealed ? 'bg-green-500' : 'bg-gray-400'
          }`}
        >
          <Text className="text-white font-semibold">
            {revealed ? 'Next →' : 'Skip →'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
