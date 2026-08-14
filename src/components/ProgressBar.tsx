import React from 'react';
import { View, Text } from 'react-native';

interface ProgressBarProps {
  progress: number; // 0.0 to 1.0
  label?: string;
  showPercentage?: boolean;
  color?: 'blue' | 'green' | 'amber' | 'red';
  size?: 'sm' | 'md' | 'lg';
}

export function ProgressBar({
  progress,
  label,
  showPercentage = true,
  color = 'blue',
  size = 'md',
}: ProgressBarProps) {
  const percentage = Math.round(progress * 100);

  const colorStyles = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
  };

  const sizeStyles = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <View className="w-full">
      {label && (
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-sm font-medium text-gray-700">{label}</Text>
          {showPercentage && (
            <Text className="text-sm font-medium text-gray-600">{percentage}%</Text>
          )}
        </View>
      )}
      <View className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeStyles[size]}`}>
        <View
          className={`${colorStyles[color]} ${sizeStyles[size]} rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </View>
    </View>
  );
}
