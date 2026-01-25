import { View, Text, TouchableOpacity } from 'react-native';

interface ErrorDisplayProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorDisplay({ message, onRetry }: ErrorDisplayProps) {
  return (
    <View className="flex-1 items-center justify-center bg-gray-50 p-6">
      <Text className="text-red-500 text-lg font-semibold mb-2">Something went wrong</Text>
      <Text className="text-gray-600 text-center mb-4">{message}</Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} className="bg-blue-500 px-6 py-3 rounded-lg">
          <Text className="text-white font-semibold">Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
