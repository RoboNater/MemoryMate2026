import { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VerseDetail, ConfirmDialog } from '@/components';
import { getVerseById, mockProgress, getTestResultsForVerse } from '@/utils/mockData';

export default function VerseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);

  const verse = getVerseById(id || '');
  const progress = verse ? mockProgress[verse.id] : undefined;
  const testHistory = verse ? getTestResultsForVerse(verse.id) : [];

  if (!verse) {
    return (
      <View className="flex-1 bg-white items-center justify-center p-6">
        <Text className="text-xl font-bold text-gray-900 mb-2">Verse Not Found</Text>
        <Text className="text-gray-600 text-center">
          The verse you're looking for doesn't exist or has been deleted.
        </Text>
      </View>
    );
  }

  const handlePractice = () => {
    // Navigate to practice screen for this specific verse
    router.push(`/practice/${verse.id}`);
  };

  const handleTest = () => {
    // Navigate to test screen for this specific verse
    router.push(`/test/${verse.id}`);
  };

  const handleEdit = () => {
    router.push(`/verse/${verse.id}/edit`);
  };

  const handleArchive = () => {
    setShowArchiveDialog(true);
  };

  const confirmArchive = () => {
    setShowArchiveDialog(false);
    // In Phase 4, this will call the actual archive function
    Alert.alert(
      'Success',
      `Verse ${verse.archived ? 'unarchived' : 'archived'} successfully (mock action)`,
      [{ text: 'OK' }]
    );
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    setShowDeleteDialog(false);
    // In Phase 4, this will call the actual delete function
    Alert.alert(
      'Verse Deleted',
      'Verse deleted successfully (mock action)',
      [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]
    );
  };

  return (
    <>
      <VerseDetail
        verse={verse}
        progress={progress}
        testHistory={testHistory}
        onPractice={handlePractice}
        onTest={handleTest}
        onEdit={handleEdit}
        onArchive={handleArchive}
        onDelete={handleDelete}
      />

      <ConfirmDialog
        visible={showArchiveDialog}
        title={verse.archived ? 'Unarchive Verse' : 'Archive Verse'}
        message={
          verse.archived
            ? 'This will restore the verse to your active list.'
            : 'This will hide the verse from your active list. You can unarchive it later.'
        }
        confirmText={verse.archived ? 'Unarchive' : 'Archive'}
        confirmVariant="default"
        onConfirm={confirmArchive}
        onCancel={() => setShowArchiveDialog(false)}
      />

      <ConfirmDialog
        visible={showDeleteDialog}
        title="Delete Verse"
        message="This will permanently delete the verse and all its practice and test history. This action cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </>
  );
}
