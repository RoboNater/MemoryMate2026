import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useVerseStore } from '@/store';
import { ManageShelvesModal } from './ManageShelvesModal';

interface ShelfPickerProps {
  /** Tailwind color family for the selected chip, matching the host tab. */
  accent?: 'green' | 'purple';
}

/**
 * Active-set picker shown on the Practice and Test tabs (issue #5):
 * "All Verses" plus a chip per shelf, single-select. Selection persists
 * per device via the store. The Edit button opens shelf management.
 */
export function ShelfPicker({ accent = 'green' }: ShelfPickerProps) {
  const { shelves, activeShelfId, setActiveShelf } = useVerseStore();
  const [showManage, setShowManage] = useState(false);

  const selectedChip = accent === 'green' ? 'bg-green-600 border-green-600' : 'bg-purple-600 border-purple-600';

  const chip = (label: string, selected: boolean, onPress: () => void, key: string) => (
    <TouchableOpacity
      key={key}
      onPress={onPress}
      className={`px-4 py-2 rounded-full border ${
        selected ? selectedChip : 'bg-white border-gray-300'
      }`}
    >
      <Text className={`text-sm font-medium ${selected ? 'text-white' : 'text-gray-700'}`}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View className="bg-white rounded-lg p-4 border border-gray-200">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-sm font-semibold text-gray-700">Active set</Text>
        <TouchableOpacity onPress={() => setShowManage(true)}>
          <Text className="text-sm font-semibold text-blue-600">Edit Shelves</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          {chip('All Verses', activeShelfId === null, () => void setActiveShelf(null), 'all')}
          {shelves.map((shelf) =>
            chip(
              shelf.name,
              activeShelfId === shelf.id,
              () => void setActiveShelf(shelf.id),
              shelf.id
            )
          )}
        </View>
      </ScrollView>

      <ManageShelvesModal visible={showManage} onClose={() => setShowManage(false)} />
    </View>
  );
}
