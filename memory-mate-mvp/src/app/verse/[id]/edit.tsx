import { View, Text, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VerseForm } from '@/components';
import { useVerseStore } from '@/store';

export default function EditVerseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { verses, updateVerse } = useVerseStore();

  const verse = verses.find((v) => v.id === id);

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

  const handleSave = async (updatedVerse: { reference: string; text: string; translation: string }) => {
    try {
      await updateVerse(verse.id, updatedVerse);
      Alert.alert(
        'Verse Updated',
        `${updatedVerse.reference} updated successfully`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update verse. Please try again.', [
        {
          text: 'OK',
        },
      ]);
    }
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
