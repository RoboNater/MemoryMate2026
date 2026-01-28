import { View, Text, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useState } from 'react';
import { useVerseStore } from '@/store';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

export default function SettingsScreen() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const exportData = useVerseStore((state) => state.exportData);
  const importData = useVerseStore((state) => state.importData);
  const stats = useVerseStore((state) => state.stats);

  /**
   * Handle export - generate JSON and trigger download/share
   */
  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Generate JSON
      const jsonString = await exportData();

      // Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `memorymate-export-${timestamp}.json`;

      if (Platform.OS === 'web') {
        // Web: Trigger browser download
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        Alert.alert('Success', 'Data exported successfully!');
      } else {
        // Native: Save to file system and share
        const fileUri = `${FileSystem.cacheDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, jsonString);

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/json',
            dialogTitle: 'Export MemoryMate Data',
            UTI: 'public.json',
          });
        } else {
          Alert.alert('Success', `Data exported to ${filename}`);
        }
      }
    } catch (error) {
      Alert.alert('Export Failed', error instanceof Error ? error.message : 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Handle import - file picker and data import
   */
  const handleImport = async () => {
    // Confirmation prompt
    Alert.alert(
      'Import Data',
      'This will replace all your current data. Are you sure you want to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          style: 'destructive',
          onPress: async () => {
            setIsImporting(true);
            try {
              let jsonString: string;

              if (Platform.OS === 'web') {
                // Web: File input picker
                jsonString = await pickFileWeb();
              } else {
                // Native: Document picker
                const result = await DocumentPicker.getDocumentAsync({
                  type: 'application/json',
                  copyToCacheDirectory: true,
                });

                if (result.canceled || !result.assets || result.assets.length === 0) {
                  setIsImporting(false);
                  return;
                }

                jsonString = await FileSystem.readAsStringAsync(result.assets[0].uri);
              }

              // Import the data
              const result = await importData(jsonString);

              Alert.alert(
                'Import Successful',
                `Imported:\n• ${result.versesImported} verses\n• ${result.progressImported} progress records\n• ${result.testResultsImported} test results`
              );
            } catch (error) {
              Alert.alert(
                'Import Failed',
                error instanceof Error ? error.message : 'Failed to import data'
              );
            } finally {
              setIsImporting(false);
            }
          },
        },
      ]
    );
  };

  /**
   * Web file picker helper
   */
  const pickFileWeb = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          reject(new Error('No file selected'));
          return;
        }
        try {
          const text = await file.text();
          resolve(text);
        } catch (error) {
          reject(new Error('Failed to read file'));
        }
      };
      input.onerror = () => reject(new Error('File picker cancelled'));
      input.click();
    });
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-gray-700 p-6 pb-8">
        <Text className="text-3xl font-bold text-white mb-2">Settings</Text>
        <Text className="text-gray-300">App preferences and information</Text>
      </View>

      <View className="p-6 -mt-6">
        {/* Data Management */}
        <View className="bg-white rounded-lg p-6 mb-4 border border-gray-200">
          <Text className="text-xl font-bold text-gray-900 mb-2">Data Management</Text>
          <Text className="text-sm text-gray-600 mb-4">
            Export your data for backup or import previously saved data.
          </Text>

          {/* Stats Summary */}
          {stats && (
            <View className="bg-gray-50 rounded-lg p-4 mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">Current Data:</Text>
              <View className="gap-1">
                <Text className="text-sm text-gray-600">• {stats.total_verses} verses</Text>
                <Text className="text-sm text-gray-600">• {stats.total_practiced} practice sessions</Text>
                <Text className="text-sm text-gray-600">• {stats.total_tested} tests taken</Text>
              </View>
            </View>
          )}

          {/* Export Button */}
          <TouchableOpacity
            onPress={handleExport}
            disabled={isExporting}
            className={`bg-blue-600 rounded-lg p-4 mb-3 ${isExporting ? 'opacity-50' : ''}`}
          >
            <Text className="text-white text-center font-semibold text-base">
              {isExporting ? 'Exporting...' : 'Export Data'}
            </Text>
            <Text className="text-blue-100 text-center text-sm mt-1">Download your data as JSON</Text>
          </TouchableOpacity>

          {/* Import Button */}
          <TouchableOpacity
            onPress={handleImport}
            disabled={isImporting}
            className={`bg-green-600 rounded-lg p-4 ${isImporting ? 'opacity-50' : ''}`}
          >
            <Text className="text-white text-center font-semibold text-base">
              {isImporting ? 'Importing...' : 'Import Data'}
            </Text>
            <Text className="text-green-100 text-center text-sm mt-1">Restore from JSON file</Text>
          </TouchableOpacity>

          {/* Warning */}
          <View className="bg-amber-50 p-3 rounded-lg border border-amber-200 mt-4">
            <Text className="text-amber-800 text-xs font-semibold mb-1">⚠️ Important</Text>
            <Text className="text-amber-700 text-xs">
              Importing will replace all existing data. Export your current data first if you want to keep it.
            </Text>
          </View>
        </View>

        {/* App Info */}
        <View className="bg-white rounded-lg p-6 mb-4 border border-gray-200">
          <Text className="text-xl font-bold text-gray-900 mb-4">About Memory Mate</Text>
          <View className="gap-3">
            <View>
              <Text className="text-sm text-gray-600">Version</Text>
              <Text className="text-base font-semibold text-gray-900">MVP 1.0.0</Text>
            </View>
            <View>
              <Text className="text-sm text-gray-600">Status</Text>
              <View className="bg-green-100 px-3 py-1 rounded-full self-start mt-1">
                <Text className="text-green-700 text-sm font-semibold">Phase 4 + Export/Import</Text>
              </View>
            </View>
            <View>
              <Text className="text-sm text-gray-600">Description</Text>
              <Text className="text-base text-gray-700 mt-1">
                Memory Mate helps you memorize Bible verses through practice and testing. Track your progress and build
                your memorization skills.
              </Text>
            </View>
          </View>
        </View>

        {/* Current Features */}
        <View className="bg-white rounded-lg p-6 mb-4 border border-gray-200">
          <Text className="text-lg font-bold text-gray-900 mb-3">Current Features</Text>
          <View className="gap-2">
            <View className="flex-row items-center">
              <Text className="text-green-500 text-lg mr-2">✓</Text>
              <Text className="text-gray-700">Verse management (add, edit, archive, delete)</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-green-500 text-lg mr-2">✓</Text>
              <Text className="text-gray-700">Practice mode with comfort tracking</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-green-500 text-lg mr-2">✓</Text>
              <Text className="text-gray-700">Test mode with scoring</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-green-500 text-lg mr-2">✓</Text>
              <Text className="text-gray-700">Progress statistics and tracking</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-green-500 text-lg mr-2">✓</Text>
              <Text className="text-gray-700">Data persistence (web & native)</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-green-500 text-lg mr-2">✓</Text>
              <Text className="text-gray-700">Data export/import (JSON)</Text>
            </View>
          </View>
        </View>

        {/* Next Phase */}
        <View className="bg-white rounded-lg p-6 border border-gray-200">
          <Text className="text-lg font-bold text-gray-900 mb-3">Phase 5: Feature Integration & Polish</Text>
          <View className="gap-2">
            <View className="flex-row items-center">
              <Text className="text-amber-500 text-lg mr-2">○</Text>
              <Text className="text-gray-600">Performance optimization</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-amber-500 text-lg mr-2">○</Text>
              <Text className="text-gray-600">User experience refinements</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-amber-500 text-lg mr-2">○</Text>
              <Text className="text-gray-600">Bug fixes and polish</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-amber-500 text-lg mr-2">○</Text>
              <Text className="text-gray-600">Release preparation</Text>
            </View>
          </View>
        </View>

        {/* Note */}
        <View className="bg-blue-50 p-4 rounded-lg border border-blue-100 mt-4">
          <Text className="text-blue-900 font-semibold mb-2 text-center">Ready for Production</Text>
          <Text className="text-blue-700 text-sm text-center">
            Your data is securely stored locally on your device. Export files are JSON format and can be backed up or
            transferred between devices.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
