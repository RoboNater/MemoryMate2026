import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmButtonStyles =
    confirmVariant === 'danger' ? 'bg-red-500' : 'bg-blue-500';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View className="flex-1 bg-black/50 justify-center items-center p-6">
        <View className="bg-white rounded-lg p-6 w-full max-w-md">
          {/* Title */}
          <Text className="text-xl font-bold text-gray-900 mb-3">
            {title}
          </Text>

          {/* Message */}
          <Text className="text-sm text-gray-700 mb-6 leading-5">
            {message}
          </Text>

          {/* Action Buttons */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={onCancel}
              className="flex-1 bg-gray-200 py-3 rounded-lg items-center"
            >
              <Text className="text-gray-700 font-semibold">{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              className={`flex-1 ${confirmButtonStyles} py-3 rounded-lg items-center`}
            >
              <Text className="text-white font-semibold">{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
