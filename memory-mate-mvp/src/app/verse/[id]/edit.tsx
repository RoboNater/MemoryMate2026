import { View, Text, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VerseForm } from '@/components';
import { getVerseById } from '@/utils/mockData';

export default function EditVerseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const verse = getVerseById(id || '');

  if (!verse) {
    return (
      <View className="flex-1 bg-white items-center justify-center p-6">
        <Text className="text-xl font-bold text-gray-900 mb-2">Verse Not Found</Text>
        <Text className="text-gray-600 text-center">
          The verse you're trying to edit doesn't exist or has been deleted.
        </Text>
      </View>
    );
  }

  const handleSave = (updatedVerse: { reference: string; text: string; translation: string }) => {
    // In Phase 4, this will call the actual update verse function
    Alert.alert(
      'Verse Updated',
      `${updatedVerse.reference} updated successfully (mock action)`,
      [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]
    );
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <VerseForm
      mode="edit"
      initialVerse={verse}
      onSave={handleSave}
      onCancel={handleCancel}
    />
  );
}
