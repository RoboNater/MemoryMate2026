import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { calculateFirstLetterScore, type FirstLetterScoreResult } from '../utils/scoring';

interface FirstLetterPracticeProps {
  verseText: string;
  translation: string;
  /**
   * Fires once, when the user submits an attempt. The caller decides what that
   * means for progress; this component records nothing itself.
   */
  onSubmit: (result: FirstLetterScoreResult) => void;
}

/**
 * "Type the first letter of each word" practice (issue #29).
 *
 * The slot row is not decoration. Scoring is positional
 * (`calculateFirstLetterScore`), so a dropped letter shifts every later word
 * out of alignment -- showing one slot per word is what makes that legible,
 * and it is also what makes the word rule visible (a hyphenate is one slot)
 * instead of something the user has to guess.
 */
export function FirstLetterPractice({
  verseText,
  translation,
  onSubmit,
}: FirstLetterPracticeProps) {
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Scored on every keystroke so the slots can fill in as the user types;
  // correctness stays hidden until they submit.
  const result = calculateFirstLetterScore(verseText, input);

  const handleSubmit = () => {
    if (submitted) return;
    setSubmitted(true);
    onSubmit(result);
  };

  const scoreColor =
    result.percentage >= 80
      ? 'text-green-700'
      : result.percentage >= 50
        ? 'text-amber-700'
        : 'text-red-700';

  return (
    <View>
      {!submitted && (
        <View className="mb-6 bg-amber-50 p-4 rounded-lg border border-amber-200">
          <Text className="text-amber-900 font-medium mb-2">
            Type the first letter of each word
          </Text>
          <Text className="text-amber-700 text-sm">
            "For God so loved the world" is "f g s l t w". Spaces are optional —
            type the letters however you like.
          </Text>
        </View>
      )}

      {/* One slot per word, filling in as you type. */}
      <View className="mb-4 bg-white p-4 rounded-xl border-2 border-gray-200">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-sm font-semibold text-gray-700">
            {submitted ? 'Your answer' : 'Your answer so far'}
          </Text>
          <Text className="text-xs text-gray-500">{result.total} words</Text>
        </View>
        <View className="flex-row flex-wrap gap-1.5">
          {result.slots.map((slot, index) => {
            const showsAnswer = submitted;
            const letter = showsAnswer ? slot.expected : (slot.typed ?? '');
            const boxColor = !submitted
              ? 'bg-gray-50 border-gray-300'
              : slot.correct
                ? 'bg-green-100 border-green-400'
                : 'bg-red-100 border-red-400';
            const letterColor = !submitted
              ? 'text-gray-900'
              : slot.correct
                ? 'text-green-800'
                : 'text-red-800';

            return (
              <View key={index} className="items-center">
                <View
                  className={`w-8 h-9 rounded border items-center justify-center ${boxColor}`}
                >
                  <Text className={`text-base font-semibold uppercase ${letterColor}`}>
                    {letter || ' '}
                  </Text>
                </View>
                {/* What they actually typed, under the answer, when wrong. */}
                <Text className="text-[10px] text-gray-400 h-4 uppercase">
                  {submitted && !slot.correct && slot.typed ? slot.typed : ''}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Input */}
      <View className="mb-4">
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="f g s l t w"
          editable={!submitted}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          numberOfLines={3}
          className={`border ${
            submitted ? 'border-gray-200 bg-gray-50' : 'border-gray-300 bg-white'
          } rounded-lg px-4 py-3 text-gray-900 text-base leading-6 tracking-widest`}
          placeholderTextColor="#9ca3af"
          textAlignVertical="top"
        />
        {!submitted && result.extra > 0 && (
          <Text className="text-xs text-amber-700 mt-1">
            {result.extra} more {result.extra === 1 ? 'letter' : 'letters'} than the
            verse has words
          </Text>
        )}
      </View>

      {!submitted ? (
        <View className="gap-3 mb-6">
          <TouchableOpacity
            onPress={handleSubmit}
            className="bg-green-500 p-4 rounded-xl items-center shadow-md active:bg-green-600"
          >
            <Text className="text-white font-bold text-lg">Check</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSubmit} className="py-2 items-center">
            <Text className="text-gray-500 text-sm font-medium">
              I don't know — show the verse
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="mb-6">
          {/* Score. Feedback only -- nothing here is stored, and it does not
              set the comfort level; the user still rates themselves. */}
          <View className="mb-4 bg-white p-4 rounded-xl border-2 border-gray-200 items-center">
            <Text className={`text-4xl font-bold ${scoreColor}`}>
              {result.percentage}%
            </Text>
            <Text className="text-sm text-gray-600 mt-1">
              {result.matches} of {result.total} words
            </Text>
            {result.extra > 0 && (
              <Text className="text-xs text-gray-500 mt-1">
                plus {result.extra} extra{' '}
                {result.extra === 1 ? 'letter' : 'letters'} past the end
              </Text>
            )}
          </View>

          <View className="bg-green-50 p-6 rounded-xl border-2 border-green-200">
            <Text className="text-gray-800 text-lg leading-8 mb-4">{verseText}</Text>
            <View className="pt-4 border-t border-green-200">
              <Text className="text-sm text-green-700 font-medium">{translation}</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
