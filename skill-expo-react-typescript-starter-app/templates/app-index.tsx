import { View, Text } from 'react-native';

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl font-bold text-blue-600">
        {{PROJECT_TITLE}}
      </Text>
      <Text className="mt-4 text-gray-600">
        Your app is ready!
      </Text>
      <Text className="mt-2 text-sm text-gray-500">
        Expo Router configured
      </Text>
      <Text className="text-sm text-gray-500">
        NativeWind (Tailwind CSS) working
      </Text>
      <Text className="text-sm text-gray-500">
        TypeScript configured
      </Text>
    </View>
  );
}
