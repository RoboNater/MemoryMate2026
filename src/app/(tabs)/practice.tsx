import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { LoadingSpinner, ShelfPicker } from '@/components';
import { useVerseStore } from '@/store';
import { type GuidedDifficulty, type PracticeMode } from '@/types';

// How many verses to show in the "choose a specific verse" list before
// collapsing behind a "show more" toggle.
const INITIAL_VISIBLE_VERSES = 15;

type PreferenceOption<T extends string> = {
  value: T;
  label: string;
  description: string;
};

// Practice modes (epic #18). The mode is chosen here and carried into every
// practice route as a `mode` param, so all three entry points below --
// practice all, needs work, and a single verse -- honour the same choice.
// The choice itself lives in the store, persisted per device (#34), so it
// survives leaving the tab and restarting the app.
const MODE_OPTIONS: PreferenceOption<PracticeMode>[] = [
  {
    value: 'reveal',
    label: 'Reveal',
    description: 'Recall the verse in your head, then reveal it and rate yourself.',
  },
  {
    value: 'letters',
    label: 'First letters',
    description: 'Type the first letter of each word and see how many you got.',
  },
];

const DIFFICULTY_OPTIONS: PreferenceOption<GuidedDifficulty>[] = [
  {
    value: 'walkthrough',
    label: 'Rhythm walkthrough',
    description: 'See every word and step through the verse without recall pressure.',
  },
  {
    value: 'easy',
    label: 'Easy',
    description: 'See most words, with a few blanks to recall.',
  },
  {
    value: 'challenge',
    label: 'Challenge',
    description: 'Recall nearly every word, with only occasional guide words.',
  },
];

export default function PracticeScreen() {
  const router = useRouter();
  const {
    isLoading,
    getActiveSetVerses,
    getActiveShelf,
    getVersesNeedingPractice,
    progress,
    practiceMode,
    guidedDifficulty,
    setPracticeMode,
    setGuidedDifficulty,
  } = useVerseStore();
  // The active set: all non-archived verses, or just the active shelf (issue #5).
  const activeVerses = getActiveSetVerses();
  const activeShelf = getActiveShelf();
  const versesNeedingWork = getVersesNeedingPractice();
  const [showAllVerses, setShowAllVerses] = useState(false);
  // A failed practice-preference write is reported here, in the picker that asked
  // for it -- the same shape `ManageShelvesModal` uses for shelf writes (#39).
  // The store's `error` is deliberately not read for this: it is shared by
  // every write, so a screen that rendered it would show failures it did not
  // cause.
  const [preferenceError, setPreferenceError] = useState<string | null>(null);

  if (isLoading) {
    return <LoadingSpinner message="Loading verses..." />;
  }

  /**
   * Pick a practice mode. `setPracticeMode` rejects if the durable write
   * failed (#39), in which case the store keeps the mode that is actually
   * persisted -- so the picker must say the choice didn't stick rather than
   * silently showing the old one back.
   */
  const chooseMode = async (mode: PracticeMode) => {
    if (mode === practiceMode) return;
    setPreferenceError(null);
    try {
      await setPracticeMode(mode);
    } catch {
      const kept = MODE_OPTIONS.find(
        (option) => option.value === practiceMode
      )?.label;
      setPreferenceError(
        `Couldn't save that choice — still set to ${kept}. Please try again.`
      );
    }
  };

  /** Difficulty uses the same durable-write contract as practice mode. */
  const chooseDifficulty = async (difficulty: GuidedDifficulty) => {
    if (difficulty === guidedDifficulty) return;
    setPreferenceError(null);
    try {
      await setGuidedDifficulty(difficulty);
    } catch {
      const kept = DIFFICULTY_OPTIONS.find(
        (option) => option.value === guidedDifficulty
      )?.label;
      setPreferenceError(
        `Couldn't save that choice — still set to ${kept}. Please try again.`
      );
    }
  };

  const startPractice = (verses: typeof activeVerses) => {
    if (verses.length === 0) return;

    // For single verse, navigate to individual practice screen
    if (verses.length === 1) {
      router.push(
        `/practice/${verses[0].id}?mode=${practiceMode}&difficulty=${guidedDifficulty}`
      );
      return;
    }

    // For multiple verses, navigate to session screen
    const verseIds = verses.map(v => v.id).join(',');
    router.push(
      `/practice/session?ids=${verseIds}&mode=${practiceMode}&difficulty=${guidedDifficulty}&index=0`
    );
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-green-500 p-6 pb-8">
        <Text className="text-3xl font-bold text-white mb-2">Practice</Text>
        <Text className="text-green-100">Review your verses to build familiarity</Text>
      </View>

      <View className="p-6 -mt-6 gap-4">
        {/* Active set picker (issue #5) */}
        <ShelfPicker accent="green" />

        {/* Practice mode picker (issue #29) */}
        {activeVerses.length > 0 && (
          <View className="bg-white rounded-lg p-4 border border-gray-200">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              How do you want to practice?
            </Text>
            <View className="flex-row gap-2">
              {MODE_OPTIONS.map((option) => {
                const isSelected = practiceMode === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    // chooseMode handles its own failure; nothing to catch here.
                    onPress={() => void chooseMode(option.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    className={`flex-1 py-2 rounded-lg items-center border ${
                      isSelected
                        ? 'bg-green-500 border-green-500'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <Text
                      className={`font-semibold ${
                        isSelected ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text className="text-xs text-gray-500 mt-2">
              {MODE_OPTIONS.find((o) => o.value === practiceMode)?.description}
            </Text>

            {practiceMode === 'letters' && (
              <View className="mt-4 pt-4 border-t border-gray-100">
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  How much help do you want?
                </Text>
                <View className="gap-2">
                  {DIFFICULTY_OPTIONS.map((option) => {
                    const isSelected = guidedDifficulty === option.value;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        // chooseDifficulty handles its own failure.
                        onPress={() => void chooseDifficulty(option.value)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: isSelected }}
                        className={`rounded-lg border px-3 py-2 ${
                          isSelected
                            ? 'bg-green-50 border-green-500'
                            : 'bg-white border-gray-300'
                        }`}
                      >
                        <Text
                          className={`font-semibold ${
                            isSelected ? 'text-green-800' : 'text-gray-700'
                          }`}
                        >
                          {option.label}
                        </Text>
                        <Text className="text-xs text-gray-500 mt-0.5">
                          {option.description}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {preferenceError && (
              <View className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 mt-2">
                <Text className="text-red-700 text-sm">{preferenceError}</Text>
              </View>
            )}
          </View>
        )}

        {activeVerses.length === 0 ? (
          <View className="bg-white rounded-lg p-8 items-center border border-gray-200">
            <Text className="text-xl font-bold text-gray-900 mb-2">
              {activeShelf ? 'Empty Shelf' : 'No Verses Yet'}
            </Text>
            <Text className="text-gray-600 text-center mb-6">
              {activeShelf
                ? `No verses on "${activeShelf.name}" yet. Assign verses to this shelf from the verse form, or pick a different set above.`
                : 'Add some verses to your collection to start practicing'}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/verse/add')}
              className="bg-blue-500 px-6 py-3 rounded-lg"
            >
              <Text className="text-white font-semibold">
                {activeShelf ? 'Add a Verse' : 'Add Your First Verse'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="gap-4">
            {/* Practice All Verses */}
            <TouchableOpacity
              onPress={() => startPractice(activeVerses)}
              className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm"
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xl font-bold text-gray-900">
                  {activeShelf ? `Practice "${activeShelf.name}"` : 'Practice All'}
                </Text>
                <View className="bg-green-100 px-3 py-1 rounded-full">
                  <Text className="text-green-700 font-semibold">
                    {activeVerses.length} verses
                  </Text>
                </View>
              </View>
              <Text className="text-gray-600 mb-4">
                {activeShelf
                  ? `Review the verses on the "${activeShelf.name}" shelf`
                  : 'Review all active verses in your collection'}
              </Text>
              <View className="bg-green-500 py-3 rounded-lg items-center">
                <Text className="text-white font-semibold">Start Practice</Text>
              </View>
            </TouchableOpacity>

            {/* Practice Verses Needing Work */}
            {versesNeedingWork.length > 0 && (
              <TouchableOpacity
                onPress={() => startPractice(versesNeedingWork)}
                className="bg-white rounded-lg p-6 border border-amber-200 shadow-sm"
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-xl font-bold text-gray-900">Needs Work</Text>
                  <View className="bg-amber-100 px-3 py-1 rounded-full">
                    <Text className="text-amber-700 font-semibold">
                      {versesNeedingWork.length} verses
                    </Text>
                  </View>
                </View>
                <Text className="text-gray-600 mb-4">
                  Focus on verses at comfort level 1-3
                </Text>
                <View className="bg-amber-500 py-3 rounded-lg items-center">
                  <Text className="text-white font-semibold">Practice These</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Individual Verses */}
            <View className="bg-white rounded-lg p-6 border border-gray-200">
              <Text className="text-lg font-bold text-gray-900 mb-4">
                Or choose a specific verse
              </Text>
              <View className="gap-2">
                {(showAllVerses
                  ? activeVerses
                  : activeVerses.slice(0, INITIAL_VISIBLE_VERSES)
                ).map((verse) => {
                  const prog = progress[verse.id];
                  const comfortLevel = prog?.comfort_level || 1;
                  const comfortColors = {
                    1: 'bg-gray-400',
                    2: 'bg-red-400',
                    3: 'bg-amber-400',
                    4: 'bg-blue-400',
                    5: 'bg-green-500',
                  };

                  return (
                    <TouchableOpacity
                      key={verse.id}
                      onPress={() =>
                        router.push(
                          `/practice/${verse.id}?mode=${practiceMode}&difficulty=${guidedDifficulty}`
                        )
                      }
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
                      <View className="flex-row items-center gap-2">
                        <View
                          className={`w-3 h-3 rounded-full ${
                            comfortColors[comfortLevel as 1 | 2 | 3 | 4 | 5]
                          }`}
                        />
                        {prog && (
                          <Text className="text-xs text-gray-500">
                            {prog.times_practiced}x
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {activeVerses.length > INITIAL_VISIBLE_VERSES && (
                  <TouchableOpacity
                    onPress={() => setShowAllVerses((v) => !v)}
                    className="mt-2 py-2"
                  >
                    <Text className="text-sm text-green-600 text-center font-semibold">
                      {showAllVerses
                        ? 'Show less'
                        : `+ ${activeVerses.length - INITIAL_VISIBLE_VERSES} more verses`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
