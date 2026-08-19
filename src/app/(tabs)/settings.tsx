import { View, Text, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { ConfirmDialog } from '@/components';
import { useVerseStore, useAuthStore, useSyncStore } from '@/store';
import { isSupabaseConfigured } from '@/services/supabaseClient';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { pickTextFile } from '@/services/filePicker';

export default function SettingsScreen() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const exportData = useVerseStore((state) => state.exportData);
  const importData = useVerseStore((state) => state.importData);
  const stats = useVerseStore((state) => state.stats);

  const user = useAuthStore((state) => state.user);
  const isAuthLoading = useAuthStore((state) => state.isAuthLoading);
  const signOut = useAuthStore((state) => state.signOut);

  const isSyncing = useSyncStore((state) => state.isSyncing);
  const lastSyncedAt = useSyncStore((state) => state.lastSyncedAt);
  const syncError = useSyncStore((state) => state.syncError);
  const syncNow = useSyncStore((state) => state.syncNow);

  // Use the in-app ConfirmDialog rather than Alert.alert: on React Native Web
  // the multi-button Alert renders but never invokes button onPress handlers,
  // so the sign-out action silently did nothing in the browser.
  const handleSignOut = () => {
    setShowSignOutDialog(true);
  };

  const confirmSignOut = () => {
    setShowSignOutDialog(false);
    signOut();
  };

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
    setIsImporting(true);
    try {
      const jsonString = await pickTextFile({
        mimeType: 'application/json',
        accept: 'application/json',
      });

      // Cancelling the picker is not a failure -- leave the screen as it was.
      if (jsonString === null) {
        return;
      }

      const result = await importData(jsonString);

      // Build warning text if present
      const warningText =
        result.warnings && result.warnings.length > 0
          ? `\n\n⚠️ Warnings:\n${result.warnings
              .slice(0, 5)
              .map((w) => `• ${w}`)
              .join('\n')}${result.warnings.length > 5 ? `\n... and ${result.warnings.length - 5} more` : ''}`
          : '';

      Alert.alert(
        'Import Successful',
        `Imported:\n• ${result.versesImported} verses\n• ${result.progressImported} progress records\n• ${result.testResultsImported} test results${warningText}`
      );
    } catch (error) {
      console.error('Import error:', error);
      Alert.alert(
        'Import Failed',
        error instanceof Error ? error.message : 'Failed to import data'
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <ConfirmDialog
        visible={showSignOutDialog}
        title="Sign Out"
        message="Sign out of cloud sync on this device? Synced data will be removed from this device and will download again the next time you sign in."
        confirmText="Sign Out"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={confirmSignOut}
        onCancel={() => setShowSignOutDialog(false)}
      />

      {/* Header */}
      <View className="bg-gray-700 p-6 pb-8">
        <Text className="text-3xl font-bold text-white mb-2">Settings</Text>
        <Text className="text-gray-300">App preferences and information</Text>
      </View>

      <View className="p-6 -mt-6">
        {/* Cloud Sync */}
        <View className="bg-white rounded-lg p-6 mb-4 border border-gray-200">
          <Text className="text-xl font-bold text-gray-900 mb-2">Cloud Sync</Text>
          {!isSupabaseConfigured ? (
            <Text className="text-sm text-gray-600">
              Cloud sync isn't configured on this build. The app works offline and your data
              stays on this device.
            </Text>
          ) : user ? (
            <>
              <Text className="text-sm text-gray-600 mb-3">
                Signed in. Your verses can sync across your devices.
              </Text>
              <View className="bg-gray-50 rounded-lg p-4 mb-4">
                <Text className="text-sm font-semibold text-gray-700">Signed in as</Text>
                <Text className="text-base text-gray-900 mt-1">{user.email}</Text>
                <Text className="text-xs text-gray-500 mt-2">
                  {isSyncing
                    ? 'Syncing…'
                    : lastSyncedAt
                      ? `Last synced ${new Date(lastSyncedAt).toLocaleString()}`
                      : 'Not synced yet'}
                </Text>
                {syncError && (
                  <Text className="text-xs text-red-600 mt-1">Sync error: {syncError}</Text>
                )}
              </View>

              <TouchableOpacity
                onPress={() => syncNow()}
                disabled={isSyncing}
                className={`bg-blue-600 rounded-lg p-4 mb-3 ${isSyncing ? 'opacity-50' : ''}`}
              >
                <Text className="text-white text-center font-semibold text-base">
                  {isSyncing ? 'Syncing…' : 'Sync Now'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSignOut}
                disabled={isAuthLoading}
                className={`bg-gray-200 rounded-lg p-4 ${isAuthLoading ? 'opacity-50' : ''}`}
              >
                <Text className="text-gray-800 text-center font-semibold text-base">
                  {isAuthLoading ? 'Working...' : 'Sign Out'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text className="text-sm text-gray-600 mb-4">
                Sign in to sync your verses and progress across all your devices.
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/login')}
                className="bg-blue-600 rounded-lg p-4"
              >
                <Text className="text-white text-center font-semibold text-base">
                  Sign In to Sync
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

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

          {/* Warning - before Import Button */}
          <View className="bg-amber-50 p-3 rounded-lg border border-amber-200">
            <Text className="text-amber-800 text-xs font-semibold mb-1">⚠️ Important</Text>
            <Text className="text-amber-700 text-xs">
              Importing will replace all existing data. Export your current data first if you want to keep it.
            </Text>
          </View>

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
