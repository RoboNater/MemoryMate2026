import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useState } from 'react';
import { calculateScore } from '@/utils/scoring';
import { Verse, VerseProgress } from '@/types';

interface VerseTestProps {
  verse: Verse;
  verseProgress?: VerseProgress;
  /** Fired when the user marks pass or fail; the parent persists the result. */
  onMarkResult: (passed: boolean, score: number | null) => void;
  /** Fired when the user gives up, so the parent can treat it as a fail. */
  onGiveUp?: () => void;
  /** Shown before a result exists; omitted when the parent supplies its own navigation. */
  onCancel?: () => void;
  /** Rendered under the panel: screen-specific actions (Done, or session nav). */
  footer?: React.ReactNode;
}

/**
 * The single-verse "type it from memory, then grade yourself" panel. Shared
 * by the standalone `test/[id]` screen and the multi-verse `test/session`
 * screen so the two don't drift -- this owns everything about testing *one*
 * verse; a session is just this component driven from a different index each
 * time (see `test/session.tsx`).
 *
 * Deliberately store- and service-free: the parent owns persistence
 * (`onMarkResult`) so this component can be reused wherever a verse needs
 * testing without dragging in `recordTestResult`.
 */
export function VerseTest({
  verse,
  verseProgress,
  onMarkResult,
  onGiveUp,
  onCancel,
  footer,
}: VerseTestProps) {
  const [userInput, setUserInput] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  const [testPassed, setTestPassed] = useState<boolean | null>(null);

  const score = showResult ? calculateScore(verse.text, userInput) : null;

  const handleCheck = () => {
    if (userInput.trim().length === 0) {
      Alert.alert('Input Required', 'Please type the verse before checking');
      return;
    }
    setShowResult(true);
  };

  const handleGiveUp = () => {
    setShowResult(true);
    setGaveUp(true);
    setTestPassed(false);
    onGiveUp?.();
  };

  // The selected button state (bold color + the ✗/✓ mark below) is the
  // feedback here -- a popup per verse would be intolerable inside a
  // multi-verse session, so marking never alerts on success. A failed save
  // is still worth surfacing; that alert lives in the parent, which is the
  // one actually persisting the result.
  const handlePassFail = (passed: boolean) => {
    setTestPassed(passed);
    onMarkResult(passed, gaveUp ? null : score?.percentage ?? null);
  };

  return (
    <View className="p-6">
      {/* Progress Indicator */}
      {verseProgress && (
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-sm text-gray-600">
            Tested {verseProgress.times_tested} times
          </Text>
          {verseProgress.times_tested > 0 && (
            <View className="bg-purple-100 px-3 py-1 rounded-full">
              <Text className="text-purple-700 text-xs font-semibold">
                {Math.round((verseProgress.times_correct / verseProgress.times_tested) * 100)}% accuracy
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Verse Reference */}
      <View className="bg-gradient-to-r from-purple-50 to-purple-100 p-8 rounded-2xl mb-6 items-center border-2 border-purple-200 shadow-sm">
        <Text className="text-sm text-gray-600 mb-2 uppercase tracking-wide">
          Test This Verse
        </Text>
        <Text className="text-3xl font-bold text-purple-700 text-center mb-1">
          {verse.reference}
        </Text>
        <Text className="text-sm text-purple-600">{verse.translation}</Text>
      </View>

      {/* Instructions */}
      {!showResult && (
        <View className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
          <Text className="text-blue-900 font-medium mb-2">
            Type the verse from memory
          </Text>
          <Text className="text-blue-700 text-sm">
            Don't peek! Try to recall as much as you can.
          </Text>
        </View>
      )}

      {/* Input Area */}
      <View className="mb-6">
        <Text className="text-gray-700 font-semibold mb-2">Your Answer:</Text>
        <TextInput
          value={userInput}
          onChangeText={setUserInput}
          placeholder="Type the verse text here..."
          multiline
          numberOfLines={8}
          editable={!showResult}
          className={`border ${
            showResult ? 'border-gray-200 bg-gray-50' : 'border-gray-300 bg-white'
          } rounded-lg px-4 py-3 text-gray-900 text-base leading-6`}
          placeholderTextColor="#9ca3af"
          textAlignVertical="top"
        />
        {userInput.length > 0 && !showResult && (
          <Text className="text-xs text-gray-500 mt-1">
            {userInput.split(/\s+/).length} words entered
          </Text>
        )}
      </View>

      {/* Action Buttons - Before Result */}
      {!showResult ? (
        <View className="gap-3 mb-6">
          <TouchableOpacity
            onPress={handleCheck}
            className="bg-blue-500 py-4 rounded-lg items-center"
          >
            <Text className="text-white font-semibold text-base">Check Answer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleGiveUp}
            className="bg-gray-400 py-4 rounded-lg items-center"
          >
            <Text className="text-white font-semibold text-base">Give Up</Text>
          </TouchableOpacity>

          {onCancel && (
            <TouchableOpacity
              onPress={onCancel}
              className="bg-gray-200 py-3 rounded-lg items-center"
            >
              <Text className="text-gray-700 font-medium">Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View className="mb-6">
          {/* Correct Answer (if gave up or after checking) */}
          <View className="bg-green-50 p-6 rounded-xl border-2 border-green-200 mb-4">
            <Text className="text-green-900 font-bold mb-3">Correct Answer:</Text>
            <Text className="text-gray-800 text-base leading-7">
              {verse.text}
            </Text>
          </View>

          {/* Score */}
          {score && !gaveUp && (
            <View className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
              <Text className="text-blue-900 font-semibold mb-2">Word Match Score:</Text>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-gray-700">
                  {score.matches} of {score.total} words correct
                </Text>
                <Text className="text-2xl font-bold text-blue-600">
                  {score.percentage}%
                </Text>
              </View>
            </View>
          )}

          {/* Pass/Fail Selection */}
          <View className="bg-white p-6 rounded-xl border-2 border-gray-200 mb-4">
            <Text className="text-gray-900 font-bold mb-3 text-center">
              Did you pass this test?
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => handlePassFail(false)}
                className={`flex-1 py-4 rounded-lg items-center ${
                  testPassed === false ? 'bg-red-600' : 'bg-red-400'
                }`}
              >
                <Text className="text-white font-semibold text-base">
                  {testPassed === false ? '✗ Fail' : 'Fail'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handlePassFail(true)}
                className={`flex-1 py-4 rounded-lg items-center ${
                  testPassed === true ? 'bg-green-600' : 'bg-green-400'
                }`}
              >
                <Text className="text-white font-semibold text-base">
                  {testPassed === true ? '✓ Pass' : 'Pass'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {footer}
        </View>
      )}

      {/* Help Text */}
      {!showResult && (
        <View className="bg-purple-50 p-4 rounded-lg border border-purple-100">
          <Text className="text-purple-900 font-semibold mb-2 text-center">
            Testing Tips
          </Text>
          <Text className="text-purple-700 text-sm text-center">
            Focus on accuracy rather than speed. It's okay to take your time.
          </Text>
        </View>
      )}
    </View>
  );
}
