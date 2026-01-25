import { useState, useEffect } from 'react';
import { View, Text, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VerseDetail, ConfirmDialog, LoadingSpinner } from '@/components';
import { useVerseStore } from '@/store';
import { TestResult } from '@/types';

export default function VerseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const { verses, progress, archiveVerse, unarchiveVerse, removeVerse, getTestHistory } = useVerseStore();
  const verse = verses.find((v) => v.id === id);

  useEffect(() => {
    const loadTestHistory = async () => {
      if (!id) return;
      try {
        const history = await getTestHistory(id);
        setTestHistory(history);
      } catch (error) {
        console.error('Failed to load test history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    loadTestHistory();
  }, [id, getTestHistory]);

  if (isLoadingHistory) {
    return <LoadingSpinner message="Loading verse details..." />;
  }

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

  const verseProgress = progress[verse.id];

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

  const confirmArchive = async () => {
    setShowArchiveDialog(false);
    if (!verse) return;

    try {
      if (verse.archived) {
        await unarchiveVerse(verse.id);
      } else {
        await archiveVerse(verse.id);
      }
      Alert.alert(
        'Success',
        `Verse ${verse.archived ? 'unarchived' : 'archived'} successfully`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update verse', [{ text: 'OK' }]);
    }
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    setShowDeleteDialog(false);
    if (!verse) return;

    try {
      await removeVerse(verse.id);
      Alert.alert('Success', 'Verse deleted successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete verse', [{ text: 'OK' }]);
    }
  };

  return (
    <>
      <VerseDetail
        verse={verse}
        progress={verseProgress}
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
