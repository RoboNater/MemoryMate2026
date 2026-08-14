import React from 'react';
import { View, Text } from 'react-native';

interface StatsCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning';
}

export function StatsCard({ label, value, subtitle, variant = 'default' }: StatsCardProps) {
  const variantStyles = {
    default: 'bg-white border-gray-200',
    primary: 'bg-blue-50 border-blue-200',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-amber-50 border-amber-200',
  };

  const textColors = {
    default: 'text-gray-900',
    primary: 'text-blue-900',
    success: 'text-green-900',
    warning: 'text-amber-900',
  };

  return (
    <View className={`border rounded-lg p-4 ${variantStyles[variant]}`}>
      <Text className={`text-3xl font-bold ${textColors[variant]}`}>
        {value}
      </Text>
      <Text className="text-sm font-medium text-gray-700 mt-1">
        {label}
      </Text>
      {subtitle && (
        <Text className="text-xs text-gray-500 mt-1">
          {subtitle}
        </Text>
      )}
    </View>
  );
}
