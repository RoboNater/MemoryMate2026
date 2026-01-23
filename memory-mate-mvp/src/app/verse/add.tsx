import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { VerseForm } from '@/components';

export default function AddVerseScreen() {
  const router = useRouter();

  const handleSave = (verse: { reference: string; text: string; translation: string }) => {
    // In Phase 4, this will call the actual add verse function
    Alert.alert(
      'Verse Added',
      `${verse.reference} added successfully (mock action)`,
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
      mode="add"
      onSave={handleSave}
      onCancel={handleCancel}
    />
  );
}
