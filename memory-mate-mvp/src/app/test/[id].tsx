import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useVerseStore } from '@/store';

export default function TestVerseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { verses, progress, recordTestResult } = useVerseStore();
  const verse = verses.find((v) => v.id === id);
  const verseProgress = verse ? progress[verse.id] : undefined;

  const [userInput, setUserInput] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  const [testPassed, setTestPassed] = useState<boolean | null>(null);

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

  // Simple word matching for scoring (can be improved in Phase 5)
  const calculateScore = () => {
    const correctWords = verse.text.toLowerCase().split(/\s+/);
    const userWords = userInput.toLowerCase().split(/\s+/);
    let matches = 0;

    correctWords.forEach((word, index) => {
      if (userWords[index] && userWords[index] === word) {
        matches++;
      }
    });

    return {
      matches,
      total: correctWords.length,
      percentage: Math.round((matches / correctWords.length) * 100),
    };
  };

  const score = showResult ? calculateScore() : null;

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
  };

  const handlePassFail = async (passed: boolean) => {
    setTestPassed(passed);
    try {
      await recordTestResult(verse.id, passed);
      Alert.alert('Success', `Test result: ${passed ? 'PASS' : 'FAIL'}`, [{ text: 'OK' }]);
    } catch (error) {
      Alert.alert('Error', 'Failed to record test result. Please try again.', [{ text: 'OK' }]);
    }
  };

  const handleDone = () => {
    if (showResult && testPassed === null) {
      Alert.alert('Please mark as Pass or Fail', 'Did you pass this test?');
      return;
    }
    router.push('/(tabs)/test');
  };

  return (
    <ScrollView className="flex-1 bg-white">
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

            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-gray-200 py-3 rounded-lg items-center"
            >
              <Text className="text-gray-700 font-medium">Cancel</Text>
            </TouchableOpacity>
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
                    {testPassed === false ? '✓ Fail' : 'Fail'}
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

            {/* Done Button */}
            <TouchableOpacity
              onPress={handleDone}
              className="bg-purple-500 py-4 rounded-lg items-center"
            >
              <Text className="text-white font-semibold text-base">
                {testPassed !== null ? 'Save & Finish' : 'Finish Test'}
              </Text>
            </TouchableOpacity>
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
    </ScrollView>
  );
}
