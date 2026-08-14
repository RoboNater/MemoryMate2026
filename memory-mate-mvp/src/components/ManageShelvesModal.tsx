import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Shelf } from '@/types';
import { useVerseStore } from '@/store';
import { ConfirmDialog } from './ConfirmDialog';

interface ManageShelvesModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Create / rename / delete shelves (issue #5). Deleting a shelf never touches
 * its verses — they just become unshelved.
 */
export function ManageShelvesModal({ visible, onClose }: ManageShelvesModalProps) {
  const { shelves, verses, createShelf, renameShelf, deleteShelf } = useVerseStore();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [shelfToDelete, setShelfToDelete] = useState<Shelf | null>(null);

  const verseCount = (shelfId: string) =>
    verses.filter((v) => v.shelf_id === shelfId && !v.archived).length;

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await createShelf(name);
      setNewName('');
    } catch {
      // store surfaces the error state; keep the input so the user can retry
    }
  };

  const startRename = (shelf: Shelf) => {
    setEditingId(shelf.id);
    setEditingName(shelf.name);
  };

  const handleRename = async () => {
    const name = editingName.trim();
    if (!editingId || !name) {
      setEditingId(null);
      return;
    }
    try {
      await renameShelf(editingId, name);
    } finally {
      setEditingId(null);
      setEditingName('');
    }
  };

  const handleDelete = async () => {
    if (!shelfToDelete) return;
    const shelf = shelfToDelete;
    setShelfToDelete(null);
    try {
      await deleteShelf(shelf.id);
    } catch {
      // store surfaces the error state
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-2xl p-6 max-h-[80%]">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-bold text-gray-900">Shelves</Text>
            <TouchableOpacity onPress={onClose} className="px-3 py-1">
              <Text className="text-blue-600 font-semibold">Done</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-sm text-gray-600 mb-4">
            Group verses onto shelves, then pick one as your active set for practice
            and testing. Deleting a shelf keeps its verses — they just come off the shelf.
          </Text>

          {/* Create */}
          <View className="flex-row gap-2 mb-4">
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="New shelf name..."
              className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900"
              onSubmitEditing={handleCreate}
            />
            <TouchableOpacity
              onPress={handleCreate}
              disabled={!newName.trim()}
              className={`px-4 py-2 rounded-lg items-center justify-center ${
                newName.trim() ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            >
              <Text className="text-white font-semibold">Add</Text>
            </TouchableOpacity>
          </View>

          {/* Shelf list */}
          <ScrollView className="max-h-96">
            {shelves.length === 0 ? (
              <Text className="text-gray-400 text-center py-6">
                No shelves yet. Create one above.
              </Text>
            ) : (
              shelves.map((shelf) => (
                <View
                  key={shelf.id}
                  className="flex-row items-center justify-between py-3 border-b border-gray-100"
                >
                  {editingId === shelf.id ? (
                    <>
                      <TextInput
                        value={editingName}
                        onChangeText={setEditingName}
                        autoFocus
                        className="flex-1 bg-white border border-blue-300 rounded-lg px-3 py-1.5 text-gray-900 mr-2"
                        onSubmitEditing={handleRename}
                      />
                      <TouchableOpacity onPress={handleRename} className="px-3 py-1.5">
                        <Text className="text-blue-600 font-semibold">Save</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <View className="flex-1">
                        <Text className="font-semibold text-gray-900">{shelf.name}</Text>
                        <Text className="text-xs text-gray-500 mt-0.5">
                          {verseCount(shelf.id)} verses
                        </Text>
                      </View>
                      <View className="flex-row gap-1">
                        <TouchableOpacity
                          onPress={() => startRename(shelf)}
                          className="px-3 py-1.5"
                        >
                          <Text className="text-blue-600 font-medium">Rename</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setShelfToDelete(shelf)}
                          className="px-3 py-1.5"
                        >
                          <Text className="text-red-500 font-medium">Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>

      <ConfirmDialog
        visible={shelfToDelete !== null}
        title="Delete Shelf"
        message={`Delete "${shelfToDelete?.name ?? ''}"? Its verses are kept — they just won't be on a shelf anymore.`}
        confirmText="Delete"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShelfToDelete(null)}
      />
    </Modal>
  );
}
