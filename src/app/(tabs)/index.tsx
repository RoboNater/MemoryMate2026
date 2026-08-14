import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { StatsCard, LoadingSpinner } from '@/components';
import { useVerseStore } from '@/store';

export default function HomeScreen() {
  const router = useRouter();
  const { stats, verses, progress, isLoading } = useVerseStore();

  if (isLoading || !stats) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  // Calculate additional stats
  const versesNeedingWork = Object.values(progress).filter(
    (p: any) => p.comfort_level <= 2
  ).length;

  const recentlyPracticed = verses
    .filter((v) => !v.archived)
    .filter((v) => {
      const prog = progress[v.id];
      return prog && prog.last_practiced;
    })
    .sort((a, b) => {
      const progressA = progress[a.id];
      const progressB = progress[b.id];
      if (!progressA?.last_practiced) return 1;
      if (!progressB?.last_practiced) return -1;
      return (
        new Date(progressB.last_practiced).getTime() -
        new Date(progressA.last_practiced).getTime()
      );
    })
    .slice(0, 3);

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-blue-500 p-6 pb-8">
        <Text className="text-3xl font-bold text-white mb-2">Memory Mate</Text>
        <Text className="text-blue-100">Track your memorization progress</Text>
      </View>

      {/* Stats Grid */}
      <View className="p-6 -mt-6">
        <View className="flex-row flex-wrap gap-3 mb-6">
          <View className="flex-1 min-w-[45%]">
            <StatsCard
              label="Active Verses"
              value={stats.active_verses}
              variant="primary"
            />
          </View>
          <View className="flex-1 min-w-[45%]">
            <StatsCard
              label="Total Practiced"
              value={stats.total_practiced}
              variant="default"
            />
          </View>
          <View className="flex-1 min-w-[45%]">
            <StatsCard
              label="Tests Taken"
              value={stats.total_tested}
              variant="default"
            />
          </View>
          <View className="flex-1 min-w-[45%]">
            <StatsCard
              label="Overall Accuracy"
              value={`${Math.round(stats.overall_accuracy * 100)}%`}
              variant="success"
            />
          </View>
        </View>

        {/* Comfort Level Distribution */}
        <View className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
          <Text className="text-lg font-bold text-gray-900 mb-4">
            Verses by Comfort Level
          </Text>
          <View className="gap-2">
            {[5, 4, 3, 2, 1].map((level) => {
              const count = stats.verses_by_comfort[level as 1 | 2 | 3 | 4 | 5];
              const percentage = stats.active_verses > 0
                ? (count / stats.active_verses) * 100
                : 0;

              const labels = {
                5: 'Memorized',
                4: 'Almost There',
                3: 'Getting Familiar',
                2: 'Learning',
                1: 'New',
              };

              const colors = {
                5: 'bg-green-500',
                4: 'bg-blue-500',
                3: 'bg-amber-500',
                2: 'bg-red-500',
                1: 'bg-gray-400',
              };

              return (
                <View key={level} className="flex-row items-center gap-2">
                  <Text className="text-sm font-medium text-gray-700 w-32">
                    {labels[level as 1 | 2 | 3 | 4 | 5]}
                  </Text>
                  <View className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                    <View
                      className={`${colors[level as 1 | 2 | 3 | 4 | 5]} h-6 rounded-full`}
                      style={{ width: `${percentage}%` }}
                    />
                  </View>
                  <Text className="text-sm font-semibold text-gray-900 w-8 text-right">
                    {count}
                  </Text>
                </View>
              );
            })}
          </View>
          <View className="mt-4 pt-4 border-t border-gray-200">
            <Text className="text-sm text-gray-600">
              Average Comfort Level:{' '}
              <Text className="font-semibold text-gray-900">
                {stats.average_comfort.toFixed(1)}/5.0
              </Text>
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-900 mb-3">Quick Actions</Text>
          <View className="gap-3">
            <TouchableOpacity
              onPress={() => router.push('/verse/add')}
              className="bg-blue-500 py-4 rounded-lg items-center"
            >
              <Text className="text-white font-semibold text-base">Add New Verse</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/practice')}
              className="bg-green-500 py-4 rounded-lg items-center"
            >
              <Text className="text-white font-semibold text-base">Start Practice</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/test')}
              className="bg-purple-500 py-4 rounded-lg items-center"
            >
              <Text className="text-white font-semibold text-base">Take a Test</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Needs Attention */}
        {versesNeedingWork > 0 && (
          <View className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <Text className="text-amber-900 font-semibold mb-1">
              {versesNeedingWork} {versesNeedingWork === 1 ? 'verse needs' : 'verses need'} more practice
            </Text>
            <Text className="text-amber-700 text-sm mb-3">
              Focus on verses at comfort level 1-2 to improve retention
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/practice')}
              className="bg-amber-500 py-2 rounded items-center"
            >
              <Text className="text-white font-medium">Practice Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Recently Practiced */}
        {recentlyPracticed.length > 0 && (
          <View className="bg-white rounded-lg p-4 border border-gray-200">
            <Text className="text-lg font-bold text-gray-900 mb-3">
              Recently Practiced
            </Text>
            <View className="gap-2">
              {recentlyPracticed.map((verse) => (
                <TouchableOpacity
                  key={verse.id}
                  onPress={() => router.push(`/verse/${verse.id}`)}
                  className="flex-row justify-between items-center py-2 border-b border-gray-100"
                >
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-900">
                      {verse.reference}
                    </Text>
                    <Text className="text-xs text-gray-500 mt-0.5">
                      {verse.translation}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <View
                      className={`w-3 h-3 rounded-full ${
                        progress[verse.id]?.comfort_level >= 4
                          ? 'bg-green-500'
                          : 'bg-amber-500'
                      }`}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
