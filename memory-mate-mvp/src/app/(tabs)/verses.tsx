import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { VerseCard, LoadingSpinner } from '@/components';
import { useVerseStore } from '@/store';

export default function VersesScreen() {
  const router = useRouter();
  const [showArchived, setShowArchived] = useState(false);
  const { verses, progress, isLoading, getActiveVerses, getArchivedVerses } = useVerseStore();

  const displayVerses = showArchived ? getArchivedVerses() : getActiveVerses();
  const activeCount = getActiveVerses().length;
  const archivedCount = getArchivedVerses().length;

  if (isLoading) {
    return <LoadingSpinner message="Loading verses..." />;
  }

  const handleVersePress = (verseId: string) => {
    router.push(`/verse/${verseId}`);
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white p-6 border-b border-gray-200">
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-2xl font-bold text-gray-900">My Verses</Text>
            <Text className="text-sm text-gray-600 mt-1">
              {activeCount} active {archivedCount > 0 && `• ${archivedCount} archived`}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/verse/add')}
            className="bg-blue-500 px-4 py-2 rounded-lg"
          >
            <Text className="text-white font-semibold">+ Add</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Toggle */}
        {archivedCount > 0 && (
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => setShowArchived(false)}
              className={`flex-1 py-2 rounded-lg ${
                !showArchived ? 'bg-blue-500' : 'bg-gray-100'
              }`}
            >
              <Text
                className={`text-center font-medium ${
                  !showArchived ? 'text-white' : 'text-gray-600'
                }`}
              >
                Active ({activeCount})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowArchived(true)}
              className={`flex-1 py-2 rounded-lg ${
                showArchived ? 'bg-blue-500' : 'bg-gray-100'
              }`}
            >
              <Text
                className={`text-center font-medium ${
                  showArchived ? 'text-white' : 'text-gray-600'
                }`}
              >
                All ({verses.length})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Verse List */}
      <ScrollView className="flex-1 p-4">
        {displayVerses.length === 0 ? (
          <View className="flex-1 items-center justify-center py-12">
            <Text className="text-gray-400 text-lg mb-4">No verses yet</Text>
            <Text className="text-gray-500 text-sm text-center mb-6 px-8">
              Add your first verse to start building your memorization collection
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/verse/add')}
              className="bg-blue-500 px-6 py-3 rounded-lg"
            >
              <Text className="text-white font-semibold">Add Your First Verse</Text>
            </TouchableOpacity>
          </View>
        ) : (
          displayVerses.map((verse) => (
            <VerseCard
              key={verse.id}
              verse={verse}
              progress={progress[verse.id]}
              onPress={handleVersePress}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
