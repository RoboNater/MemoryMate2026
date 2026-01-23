import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Verse, VerseProgress, COMFORT_LABELS } from '../types';

interface VerseCardProps {
  verse: Verse;
  progress?: VerseProgress;
  onPress: (verseId: string) => void;
}

export function VerseCard({ verse, progress, onPress }: VerseCardProps) {
  const truncateText = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getComfortColor = (level: number) => {
    if (level === 1) return 'bg-gray-400';
    if (level === 2) return 'bg-red-400';
    if (level === 3) return 'bg-amber-400';
    if (level === 4) return 'bg-blue-400';
    return 'bg-green-500';
  };

  const getAccuracy = () => {
    if (!progress || progress.times_tested === 0) return null;
    return Math.round((progress.times_correct / progress.times_tested) * 100);
  };

  const accuracy = getAccuracy();

  return (
    <TouchableOpacity
      onPress={() => onPress(verse.id)}
      className={`bg-white rounded-lg p-4 mb-3 border ${
        verse.archived ? 'border-gray-300 bg-gray-50' : 'border-gray-200'
      } shadow-sm`}
    >
      {/* Header: Reference and Translation */}
      <View className="flex-row justify-between items-start mb-2">
        <Text className={`text-lg font-bold ${verse.archived ? 'text-gray-500' : 'text-gray-900'}`}>
          {verse.reference}
        </Text>
        <View className="flex-row items-center gap-2">
          <View className="bg-blue-100 px-2 py-1 rounded">
            <Text className="text-xs font-semibold text-blue-700">
              {verse.translation}
            </Text>
          </View>
          {verse.archived && (
            <View className="bg-gray-200 px-2 py-1 rounded">
              <Text className="text-xs font-semibold text-gray-600">
                Archived
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Verse Preview */}
      <Text className={`text-sm mb-3 ${verse.archived ? 'text-gray-500' : 'text-gray-700'}`}>
        {truncateText(verse.text)}
      </Text>

      {/* Progress Indicators */}
      {progress && (
        <View className="flex-row justify-between items-center">
          {/* Comfort Level */}
          <View className="flex-row items-center gap-2">
            <View className={`w-3 h-3 rounded-full ${getComfortColor(progress.comfort_level)}`} />
            <Text className="text-xs text-gray-600">
              {COMFORT_LABELS[progress.comfort_level]}
            </Text>
          </View>

          {/* Stats */}
          <View className="flex-row items-center gap-3">
            {progress.times_practiced > 0 && (
              <Text className="text-xs text-gray-600">
                Practiced: {progress.times_practiced}
              </Text>
            )}
            {accuracy !== null && (
              <Text className="text-xs text-gray-600 font-semibold">
                {accuracy}% accuracy
              </Text>
            )}
          </View>
        </View>
      )}

      {!progress && (
        <Text className="text-xs text-gray-500 italic">
          Not yet practiced
        </Text>
      )}
    </TouchableOpacity>
  );
}
