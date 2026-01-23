import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Verse, TRANSLATIONS } from '../types';

interface VerseFormProps {
  initialVerse?: Partial<Verse>;
  onSave: (verse: { reference: string; text: string; translation: string }) => void;
  onCancel: () => void;
  mode: 'add' | 'edit';
}

export function VerseForm({ initialVerse, onSave, onCancel, mode }: VerseFormProps) {
  const [reference, setReference] = useState(initialVerse?.reference || '');
  const [text, setText] = useState(initialVerse?.text || '');
  const [translation, setTranslation] = useState(initialVerse?.translation || 'NIV');
  const [errors, setErrors] = useState<{ reference?: string; text?: string }>({});

  const validate = () => {
    const newErrors: { reference?: string; text?: string } = {};

    if (!reference.trim()) {
      newErrors.reference = 'Reference is required';
    }

    if (!text.trim()) {
      newErrors.text = 'Verse text is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave({
        reference: reference.trim(),
        text: text.trim(),
        translation,
      });
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-6">
        <Text className="text-2xl font-bold text-gray-900 mb-6">
          {mode === 'add' ? 'Add New Verse' : 'Edit Verse'}
        </Text>

        {/* Reference Input */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Verse Reference *
          </Text>
          <TextInput
            value={reference}
            onChangeText={setReference}
            placeholder="e.g., John 3:16"
            className={`bg-white border ${
              errors.reference ? 'border-red-500' : 'border-gray-300'
            } rounded-lg px-4 py-3 text-gray-900`}
          />
          {errors.reference && (
            <Text className="text-red-500 text-xs mt-1">{errors.reference}</Text>
          )}
        </View>

        {/* Translation Picker */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Translation
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {TRANSLATIONS.map((trans) => (
              <TouchableOpacity
                key={trans}
                onPress={() => setTranslation(trans)}
                className={`px-4 py-2 rounded-full border ${
                  translation === trans
                    ? 'bg-blue-500 border-blue-500'
                    : 'bg-white border-gray-300'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    translation === trans ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  {trans}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Verse Text Input */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Verse Text *
          </Text>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Enter the full verse text..."
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            className={`bg-white border ${
              errors.text ? 'border-red-500' : 'border-gray-300'
            } rounded-lg px-4 py-3 text-gray-900 min-h-[150px]`}
          />
          {errors.text && (
            <Text className="text-red-500 text-xs mt-1">{errors.text}</Text>
          )}
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={onCancel}
            className="flex-1 bg-gray-200 py-3 rounded-lg items-center"
          >
            <Text className="text-gray-700 font-semibold">Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            className="flex-1 bg-blue-500 py-3 rounded-lg items-center"
          >
            <Text className="text-white font-semibold">
              {mode === 'add' ? 'Add Verse' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
