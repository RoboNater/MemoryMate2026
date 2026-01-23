import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { COMFORT_LABELS } from '../types';

interface ComfortLevelPickerProps {
  value: 1 | 2 | 3 | 4 | 5;
  onChange: (level: 1 | 2 | 3 | 4 | 5) => void;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ComfortLevelPicker({
  value,
  onChange,
  label,
  size = 'md',
}: ComfortLevelPickerProps) {
  const levels: (1 | 2 | 3 | 4 | 5)[] = [1, 2, 3, 4, 5];

  const sizeStyles = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const getColorForLevel = (level: number) => {
    if (level === 1) return 'bg-gray-300';
    if (level === 2) return 'bg-red-300';
    if (level === 3) return 'bg-amber-300';
    if (level === 4) return 'bg-blue-300';
    return 'bg-green-400';
  };

  const getSelectedColorForLevel = (level: number) => {
    if (level === 1) return 'bg-gray-500';
    if (level === 2) return 'bg-red-500';
    if (level === 3) return 'bg-amber-500';
    if (level === 4) return 'bg-blue-500';
    return 'bg-green-600';
  };

  return (
    <View className="w-full">
      {label && (
        <Text className="text-sm font-medium text-gray-700 mb-2">{label}</Text>
      )}
      <View className="flex-row justify-between items-center gap-2">
        {levels.map((level) => {
          const isSelected = value === level;
          return (
            <TouchableOpacity
              key={level}
              onPress={() => onChange(level)}
              className={`${sizeStyles[size]} rounded-full items-center justify-center ${
                isSelected ? getSelectedColorForLevel(level) : getColorForLevel(level)
              } ${isSelected ? 'border-2 border-gray-700' : 'border border-gray-300'}`}
            >
              <Text
                className={`font-bold ${textSizes[size]} ${
                  isSelected ? 'text-white' : 'text-gray-700'
                }`}
              >
                {level}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text className="text-xs text-gray-600 mt-2 text-center">
        {COMFORT_LABELS[value]}
      </Text>
    </View>
  );
}
