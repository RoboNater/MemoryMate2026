import React from 'react';
import { View, Text } from 'react-native';

interface TestResultBadgeProps {
  passed: boolean;
  score?: number; // 0.0 to 1.0
  timestamp?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function TestResultBadge({ passed, score, timestamp, size = 'md' }: TestResultBadgeProps) {
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatScore = (score: number) => {
    return `${Math.round(score * 100)}%`;
  };

  return (
    <View className="flex-row items-center gap-2">
      <View
        className={`rounded-full ${sizeStyles[size]} ${
          passed ? 'bg-green-100' : 'bg-red-100'
        }`}
      >
        <Text
          className={`font-semibold ${
            passed ? 'text-green-700' : 'text-red-700'
          }`}
        >
          {passed ? 'Pass' : 'Fail'}
        </Text>
      </View>
      {score !== undefined && (
        <Text className="text-sm text-gray-600 font-medium">
          {formatScore(score)}
        </Text>
      )}
      {timestamp && (
        <Text className="text-xs text-gray-500">
          {formatDate(timestamp)}
        </Text>
      )}
    </View>
  );
}
