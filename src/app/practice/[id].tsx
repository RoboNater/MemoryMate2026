import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ComfortLevelPicker } from '@/components';
import { useVerseStore } from '@/store';

export default function PracticeVerseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { verses, progress, recordPractice, setComfortLevel: setComfortLevelAction } = useVerseStore();
  const verse = verses.find((v) => v.id === id);
  const verseProgress = verse ? progress[verse.id] : undefined;

  const [revealed, setRevealed] = useState(false);
  const [comfortLevel, setComfortLevel] = useState<1 | 2 | 3 | 4 | 5>(
    verseProgress?.comfort_level || 1
  );

  if (!verse) {
    return (
      <View className="flex-1 bg-white items-center justify-center p-6">
        <Text className="text-xl font-bold text-gray-900 mb-2">Verse Not Found</Text>
        <Text className="text-gray-600 text-center">
          The verse you're trying to practice doesn't exist.
        </Text>
      </View>
    );
  }

  const handleSaveProgress = async () => {
    try {
      await recordPractice(verse.id);
      await setComfortLevelAction(verse.id, comfortLevel);
      Alert.alert('Success', `Comfort level ${comfortLevel} saved`, [{ text: 'OK' }]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save progress. Please try again.', [{ text: 'OK' }]);
    }
  };

  const handleDone = async () => {
    if (revealed) {
      await handleSaveProgress();
    }
    router.push('/(tabs)/practice');
  };

  return (
    <ScrollView className="flex-1 bg-white">
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

        {/* Action Buttons */}
        <View className="gap-3 mb-6">
          {revealed && (
            <TouchableOpacity
              onPress={handleSaveProgress}
              className="bg-blue-500 py-4 rounded-lg items-center"
            >
              <Text className="text-white font-semibold text-base">
                Save & Continue
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleDone}
            className="bg-gray-200 py-4 rounded-lg items-center"
          >
            <Text className="text-gray-700 font-semibold text-base">
              {revealed ? 'Save & Finish' : 'Skip & Finish'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Help Text */}
        <View className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <Text className="text-blue-900 font-semibold mb-2 text-center">
            Practice Tips
          </Text>
          <Text className="text-blue-700 text-sm text-center">
            Regular practice builds long-term retention. Try to practice daily for best results.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
