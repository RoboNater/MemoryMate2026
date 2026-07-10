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
      // Leave the form once the verse is saved; returning to the list is the
      // confirmation. (We used to navigate from a success Alert's OK onPress,
      // which never fires on React Native Web, leaving the user stuck here.)
      // On web there's often no back-stack entry to pop, so router.back() warns
      // and dumps the user at the root — fall back to an explicit destination.
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/verses');
      }
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
