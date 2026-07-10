import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { VerseForm } from '@/components';
import { useVerseStore } from '@/store';

export default function AddVerseScreen() {
  const router = useRouter();
  const { addVerse } = useVerseStore();

  const handleSave = async (verse: { reference: string; text: string; translation: string }) => {
    try {
      await addVerse(verse.reference, verse.text, verse.translation);
      // Navigate back immediately. We used to show a success Alert and navigate
      // from its OK onPress, but that handler never fires on React Native Web,
      // leaving the user stuck on the form. Returning to the list is the
      // confirmation.
      router.back();
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to add verse. Please try again.',
        [
          {
            text: 'OK',
          },
        ]
      );
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <VerseForm
      mode="add"
      onSave={handleSave}
      onCancel={handleCancel}
    />
  );
}
