import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Verse, VerseProgress, TestResult, COMFORT_LABELS } from '../types';
import { TestResultBadge } from './TestResultBadge';
import { ProgressBar } from './ProgressBar';

interface VerseDetailProps {
  verse: Verse;
  progress?: VerseProgress;
  testHistory?: TestResult[];
  onPractice: () => void;
  onTest: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

export function VerseDetail({
  verse,
  progress,
  testHistory = [],
  onPractice,
  onTest,
  onEdit,
  onArchive,
  onDelete,
}: VerseDetailProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getAccuracy = () => {
    if (!progress || progress.times_tested === 0) return 0;
    return progress.times_correct / progress.times_tested;
  };

  const accuracy = getAccuracy();

  return (
    <ScrollView className="flex-1 bg-white">
      {/* Verse Reference Header */}
      <View className="bg-blue-50 p-6 border-b border-blue-100">
        <Text className="text-2xl font-bold text-gray-900 mb-2">
          {verse.reference}
        </Text>
        <View className="flex-row items-center gap-2">
          <View className="bg-blue-200 px-3 py-1 rounded-full">
            <Text className="text-sm font-semibold text-blue-800">
              {verse.translation}
            </Text>
          </View>
          {verse.archived && (
            <View className="bg-gray-300 px-3 py-1 rounded-full">
              <Text className="text-sm font-semibold text-gray-700">
                Archived
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Verse Text */}
      <View className="p-6 bg-gray-50">
        <Text className="text-base leading-7 text-gray-800">
          {verse.text}
        </Text>
      </View>

      {/* Progress Section */}
      {progress && (
        <View className="p-6 border-t border-gray-200">
          <Text className="text-lg font-bold text-gray-900 mb-4">
            Progress
          </Text>

          {/* Comfort Level */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Comfort Level
            </Text>
            <View className="flex-row items-center gap-2">
              <View className="flex-1">
                <ProgressBar
                  progress={progress.comfort_level / 5}
                  color={progress.comfort_level >= 4 ? 'green' : 'amber'}
                  showPercentage={false}
                />
              </View>
              <Text className="text-sm font-semibold text-gray-900">
                {progress.comfort_level}/5
              </Text>
            </View>
            <Text className="text-xs text-gray-600 mt-1">
              {COMFORT_LABELS[progress.comfort_level]}
            </Text>
          </View>

          {/* Stats Grid */}
          <View className="flex-row flex-wrap gap-3 mb-4">
            <View className="flex-1 bg-white p-3 rounded-lg border border-gray-200 min-w-[45%]">
              <Text className="text-2xl font-bold text-gray-900">
                {progress.times_practiced}
              </Text>
              <Text className="text-xs text-gray-600 mt-1">
                Times Practiced
              </Text>
            </View>
            <View className="flex-1 bg-white p-3 rounded-lg border border-gray-200 min-w-[45%]">
              <Text className="text-2xl font-bold text-gray-900">
                {progress.times_tested}
              </Text>
              <Text className="text-xs text-gray-600 mt-1">
                Times Tested
              </Text>
            </View>
            <View className="flex-1 bg-white p-3 rounded-lg border border-gray-200 min-w-[45%]">
              <Text className="text-2xl font-bold text-green-600">
                {progress.times_correct}
              </Text>
              <Text className="text-xs text-gray-600 mt-1">
                Times Correct
              </Text>
            </View>
            <View className="flex-1 bg-white p-3 rounded-lg border border-gray-200 min-w-[45%]">
              <Text className="text-2xl font-bold text-blue-600">
                {Math.round(accuracy * 100)}%
              </Text>
              <Text className="text-xs text-gray-600 mt-1">
                Accuracy
              </Text>
            </View>
          </View>

          {/* Last Activity */}
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-xs text-gray-600">Last Practiced</Text>
              <Text className="text-sm font-medium text-gray-900 mt-1">
                {formatDate(progress.last_practiced)}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-600">Last Tested</Text>
              <Text className="text-sm font-medium text-gray-900 mt-1">
                {formatDate(progress.last_tested)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {!progress && (
        <View className="p-6 border-t border-gray-200">
          <Text className="text-sm text-gray-500 italic text-center">
            No progress data yet. Start practicing to track your progress!
          </Text>
        </View>
      )}

      {/* Test History */}
      {testHistory.length > 0 && (
        <View className="p-6 border-t border-gray-200">
          <Text className="text-lg font-bold text-gray-900 mb-4">
            Test History
          </Text>
          <View className="gap-2">
            {testHistory.slice(0, 5).map((result) => (
              <View
                key={result.id}
                className="flex-row items-center justify-between py-2"
              >
                <TestResultBadge
                  passed={result.passed}
                  score={result.score}
                  timestamp={result.timestamp}
                />
              </View>
            ))}
          </View>
          {testHistory.length > 5 && (
            <Text className="text-xs text-gray-500 mt-2 text-center">
              Showing 5 most recent tests
            </Text>
          )}
        </View>
      )}

      {/* Action Buttons */}
      <View className="p-6 gap-3">
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={onPractice}
            className="flex-1 bg-blue-500 py-3 rounded-lg items-center"
          >
            <Text className="text-white font-semibold">Practice</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onTest}
            className="flex-1 bg-green-500 py-3 rounded-lg items-center"
          >
            <Text className="text-white font-semibold">Test</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={onEdit}
            className="flex-1 bg-gray-200 py-3 rounded-lg items-center"
          >
            <Text className="text-gray-700 font-semibold">Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onArchive}
            className="flex-1 bg-gray-200 py-3 rounded-lg items-center"
          >
            <Text className="text-gray-700 font-semibold">
              {verse.archived ? 'Unarchive' : 'Archive'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={onDelete}
          className="bg-red-500 py-3 rounded-lg items-center"
        >
          <Text className="text-white font-semibold">Delete Verse</Text>
        </TouchableOpacity>
      </View>

      {/* Created Date */}
      <View className="p-6 pt-0">
        <Text className="text-xs text-gray-500 text-center">
          Added {formatDate(verse.created_at)}
        </Text>
      </View>
    </ScrollView>
  );
}
