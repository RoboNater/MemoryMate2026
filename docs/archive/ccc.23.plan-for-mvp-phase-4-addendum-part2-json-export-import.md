# MVP Phase 4 Addendum, Part 2 (JSON Export/Import) - Implementation Plan

**Date**: 2026-01-26
**Status**: 📋 Ready for Implementation
**Prerequisites**: Part 1 (IndexedDB Persistence) Complete

## Overview

Part 2 adds data portability to MemoryMate through JSON export/import functionality. Users can:
- Export all their data (verses, progress, test results) as a single JSON file
- Import previously exported data to restore or transfer between devices
- Use JSON files for backup, migration, or manual editing

**Design Principles:**
- Human-readable JSON format (can be manually inspected/edited if needed)
- Complete data fidelity (all fields preserved)
- Validation on import (reject malformed/invalid data)
- Safe import process (transaction-based, all-or-nothing)
- Works identically on web and native platforms
- Clear user feedback for success/error cases

---

## JSON Format Specification

### Structure

```json
{
  "version": 1,
  "exported_at": "2026-01-26T14:30:00.000Z",
  "app": "MemoryMate",
  "data": {
    "verses": [...],
    "progress": [...],
    "test_results": [...]
  }
}
```

### Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | number | Yes | Schema version (currently 1) for future compatibility |
| `exported_at` | string | Yes | ISO 8601 timestamp when export was created |
| `app` | string | Yes | Application name ("MemoryMate") for validation |
| `data` | object | Yes | Container for all user data |

### data.verses Array

Each verse object:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "reference": "John 3:16",
  "text": "For God so loved the world that he gave his one and only Son...",
  "translation": "NIV",
  "created_at": "2026-01-15T10:30:00.000Z",
  "archived": false
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `id` | string | Yes | Valid UUID format |
| `reference` | string | Yes | Non-empty string |
| `text` | string | Yes | Non-empty string |
| `translation` | string | Yes | Non-empty string |
| `created_at` | string | Yes | Valid ISO 8601 datetime |
| `archived` | boolean | Yes | Boolean value |

### data.progress Array

Each progress object:
```json
{
  "verse_id": "550e8400-e29b-41d4-a716-446655440000",
  "times_practiced": 5,
  "times_tested": 3,
  "times_correct": 2,
  "last_practiced": "2026-01-20T16:45:00.000Z",
  "last_tested": "2026-01-22T10:15:00.000Z",
  "comfort_level": 3
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `verse_id` | string | Yes | Valid UUID, must reference existing verse |
| `times_practiced` | number | Yes | Non-negative integer |
| `times_tested` | number | Yes | Non-negative integer |
| `times_correct` | number | Yes | Non-negative integer, ≤ times_tested |
| `last_practiced` | string/null | Yes | Valid ISO 8601 datetime or null |
| `last_tested` | string/null | Yes | Valid ISO 8601 datetime or null |
| `comfort_level` | number | Yes | Integer 1-5 inclusive |

### data.test_results Array

Each test result object:
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "verse_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-01-22T10:15:00.000Z",
  "passed": true,
  "score": 0.95
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `id` | string | Yes | Valid UUID format |
| `verse_id` | string | Yes | Valid UUID, must reference existing verse |
| `timestamp` | string | Yes | Valid ISO 8601 datetime |
| `passed` | boolean | Yes | Boolean value |
| `score` | number/null | No | If present: number 0.0-1.0 inclusive |

---

## File 1: src/services/dataExportService.ts (NEW)

### Purpose
Core export/import logic that queries the database and builds/parses JSON.

### Public API

#### `exportAllDataAsJSON(): Promise<string>`

**Purpose**: Export all user data as a JSON string.

**Process**:
1. Query all verses from database (including archived)
2. Query all progress records
3. Query all test results
4. Build export object with metadata
5. Serialize to JSON string with 2-space indentation
6. Return formatted JSON string

**Error Handling**:
- Throws if database queries fail
- Includes error message with context

**Example**:
```typescript
const jsonString = await exportAllDataAsJSON();
// Returns formatted JSON string ready for file download
```

#### `importAllDataFromJSON(json: string): Promise<ImportResult>`

**Purpose**: Import data from a JSON string, replacing all existing data.

**Process**:
1. Parse JSON string (catch parse errors)
2. Validate top-level structure (version, app, data fields)
3. Validate each verse (required fields, formats)
4. Validate each progress record (references, constraints)
5. Validate each test result (references, constraints)
6. Begin database transaction
7. Delete all existing data (test_results, progress, verses in that order)
8. Insert all verses
9. Insert all progress records
10. Insert all test results
11. Commit transaction (or rollback on any error)
12. On web platform: trigger IndexedDB save
13. Return success with counts

**Return Type**:
```typescript
interface ImportResult {
  success: boolean;
  versesImported: number;
  progressImported: number;
  testResultsImported: number;
  error?: string;
}
```

**Validation Rules**:
- Version must be 1 (only supported version for now)
- App must be "MemoryMate"
- All arrays must be present (can be empty)
- Each verse ID must be unique within import
- Progress verse_id must reference a verse in the import
- Test result verse_id must reference a verse in the import
- All datetime strings must be valid ISO 8601
- All numeric constraints must be satisfied
- times_correct cannot exceed times_tested
- comfort_level must be 1-5
- score (if present) must be 0.0-1.0

**Error Handling**:
- JSON parse errors → return {success: false, error: "Invalid JSON format"}
- Missing required fields → return {success: false, error: "Missing required field: X"}
- Invalid data → return {success: false, error: "Invalid data: X"}
- Database errors during transaction → rollback, return error
- Provide specific, user-friendly error messages

**Transaction Safety**:
- All database operations in a single transaction
- If any operation fails, entire import is rolled back
- Database left unchanged on error
- On success, all data atomically replaced

### Internal Validation Functions

#### `validateExportFormat(data: any): ValidationResult`

Validates the top-level structure and returns detailed errors.

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
}
```

#### `validateVerse(verse: any): string | null`

Returns null if valid, error message string if invalid.

#### `validateProgress(progress: any, verseIds: Set<string>): string | null`

Validates progress record, checking verse_id references.

#### `validateTestResult(result: any, verseIds: Set<string>): string | null`

Validates test result, checking verse_id references.

### Implementation Notes

- Use parameterized queries for all inserts (prevent SQL injection, though not a real risk here)
- Use `withTransactionAsync()` from database adapter for transaction handling
- Build verse ID set during verse validation for foreign key validation
- Sort data on export for readability (verses by created_at DESC, test results by timestamp DESC)
- Include empty arrays in export even if no data (consistent format)

---

## File 2: src/store/verseStore.ts (MODIFY)

### Changes to Interface

Add two new actions to `VerseStore` interface:

```typescript
export interface VerseStore {
  // ... existing fields ...

  // Data export/import
  exportData: () => Promise<string>;
  importData: (json: string) => Promise<ImportResult>;
}
```

### Implementation: exportData()

```typescript
exportData: async () => {
  try {
    const jsonString = await dataExportService.exportAllDataAsJSON();
    return jsonString;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to export data';
    set({ error: errorMsg });
    throw error;
  }
}
```

**Notes**:
- No loading state (export is fast)
- Throw error to let UI handle it
- Set store error for debugging

### Implementation: importData()

```typescript
importData: async (json: string) => {
  set({ isLoading: true, error: null });
  try {
    const result = await dataExportService.importAllDataFromJSON(json);

    if (!result.success) {
      throw new Error(result.error || 'Import failed');
    }

    // Refresh all state from database
    await get().initialize();

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to import data';
    set({ error: errorMsg });
    throw error;
  } finally {
    set({ isLoading: false });
  }
}
```

**Process**:
1. Set loading state
2. Call import service
3. Check result success
4. Re-initialize store (reload all data from database)
5. Return result
6. On error, set error state and throw

**Notes**:
- Uses `initialize()` to reload all data (verses, progress, stats)
- Store state is completely refreshed after import
- Loading state shown during import (may take time for large datasets)

---

## File 3: src/app/(tabs)/settings.tsx (MODIFY)

### Current State
Currently a static screen showing app info and planned features.

### Changes Required

Transform into a functional settings screen with data management capabilities.

### New Imports

```typescript
import { View, Text, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useState } from 'react';
import { useVerseStore } from '@/store';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
```

### State Management

```typescript
const [isExporting, setIsExporting] = useState(false);
const [isImporting, setIsImporting] = useState(false);
const exportData = useVerseStore((state) => state.exportData);
const importData = useVerseStore((state) => state.importData);
const stats = useVerseStore((state) => state.stats);
```

### New Section: Data Management

Add before "App Info" section:

```tsx
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
    <Text className="text-blue-100 text-center text-sm mt-1">
      Download your data as JSON
    </Text>
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
    <Text className="text-green-100 text-center text-sm mt-1">
      Restore from JSON file
    </Text>
  </TouchableOpacity>

  {/* Warning */}
  <View className="bg-amber-50 p-3 rounded-lg border border-amber-200 mt-4">
    <Text className="text-amber-800 text-xs font-semibold mb-1">⚠️ Important</Text>
    <Text className="text-amber-700 text-xs">
      Importing will replace all existing data. Export your current data first if you want to keep it.
    </Text>
  </View>
</View>
```

### Handler: handleExport()

```typescript
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
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, jsonString);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export MemoryMate Data',
          UTI: 'public.json'
        });
      }

      Alert.alert('Success', `Data exported to ${filename}`);
    }
  } catch (error) {
    Alert.alert(
      'Export Failed',
      error instanceof Error ? error.message : 'Failed to export data'
    );
  } finally {
    setIsExporting(false);
  }
};
```

**Platform-Specific Behavior**:
- **Web**: Triggers browser download dialog
- **Native**: Saves to app documents directory and opens share sheet (AirDrop, email, etc.)

### Handler: handleImport()

```typescript
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
                copyToCacheDirectory: true
              });

              if (result.type === 'cancel') {
                setIsImporting(false);
                return;
              }

              jsonString = await FileSystem.readAsStringAsync(result.uri);
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
        }
      }
    ]
  );
};
```

**Import Flow**:
1. Show confirmation alert (destructive action warning)
2. User confirms
3. Pick file (platform-specific picker)
4. Read file contents
5. Call store importData()
6. Show success/error alert with details

### Helper: pickFileWeb()

```typescript
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
      const text = await file.text();
      resolve(text);
    };
    input.click();
  });
};
```

**Web File Picker**:
- Creates hidden file input
- Accepts only .json files
- Reads file as text
- Returns file contents

### Update App Status

Change Phase status indicator:

```tsx
<Text className="text-blue-700 text-sm font-semibold">Phase 4 Complete + Data Export/Import</Text>
```

Update "Current Features" to include:
```tsx
<View className="flex-row items-center">
  <Text className="text-green-500 text-lg mr-2">✓</Text>
  <Text className="text-gray-700">Data persistence (web & native)</Text>
</View>
<View className="flex-row items-center">
  <Text className="text-green-500 text-lg mr-2">✓</Text>
  <Text className="text-gray-700">Data export/import (JSON)</Text>
</View>
```

Remove from "Coming Soon":
- SQLite data persistence (done)
- Zustand state management (done)
- Real data layer integration (done)
- Data persistence across app restarts (done)

Move "Data export/import" from "Planned Settings" to "Current Features"

---

## Dependencies

### New Packages Required

Add to `package.json`:

```json
{
  "expo-file-system": "~18.0.7",
  "expo-sharing": "~13.0.3",
  "expo-document-picker": "~13.0.2"
}
```

**Install command**:
```bash
cd memory-mate-mvp
npx expo install expo-file-system expo-sharing expo-document-picker
```

**Why these packages**:
- `expo-file-system`: Read/write files on native platforms
- `expo-sharing`: Native share sheet for exporting
- `expo-document-picker`: Native file picker for importing

**Platform support**:
- All three work on iOS and Android
- On web, we use browser APIs instead (file input, download link)

---

## Implementation Steps

### Step 1: Install Dependencies
```bash
cd memory-mate-mvp
npx expo install expo-file-system expo-sharing expo-document-picker
```

### Step 2: Create dataExportService.ts
- Implement `exportAllDataAsJSON()`
- Implement `importAllDataFromJSON()`
- Implement validation functions
- Add comprehensive error handling
- Test with sample data

### Step 3: Update verseStore.ts
- Add `exportData()` action
- Add `importData()` action
- Wire up to service functions
- Handle errors appropriately

### Step 4: Update settings.tsx
- Add state management (isExporting, isImporting)
- Add Data Management section to UI
- Implement `handleExport()` with platform detection
- Implement `handleImport()` with confirmation
- Implement `pickFileWeb()` helper
- Update app status indicators

### Step 5: Testing
- Test export on web (browser download)
- Test export on native (share sheet)
- Test import validation (malformed JSON)
- Test import with empty data
- Test import with large dataset
- Test import error handling (invalid references)
- Test transaction rollback on error
- Verify IndexedDB persistence after import (web)
- Test cross-platform compatibility (export on web, import on native)

---

## Error Handling

### Export Errors

| Error Case | Handling |
|-----------|----------|
| Database query fails | Throw with descriptive message, show alert |
| No data to export | Still export (empty arrays), valid JSON |
| File write fails (native) | Show alert with system error |
| Share unavailable (native) | Fall back to showing file path |

### Import Errors

| Error Case | User Message |
|-----------|-------------|
| Invalid JSON syntax | "Invalid file format. Please select a valid MemoryMate export file." |
| Wrong version | "Unsupported export version. This file was created with a different version of MemoryMate." |
| Wrong app | "Invalid file. This is not a MemoryMate export file." |
| Missing required field | "Invalid export file: missing required field [field name]" |
| Invalid verse data | "Invalid verse data: [specific issue]" |
| Invalid progress reference | "Progress record references non-existent verse" |
| Invalid test result reference | "Test result references non-existent verse" |
| Database error | "Database error during import: [error]" |
| Transaction failed | "Import failed. Your existing data has not been changed." |

### Validation Examples

**Invalid JSON**:
```json
{
  "version": 1,
  "exported_at": "2026-01-26T14:30:00.000Z",
  "app": "MemoryMate",
  "data": {
    "verses": [
      { "id": "abc", "reference": "John 3:16" }  // Missing required fields
    ]
  }
}
```
Error: "Invalid verse data: missing required field 'text'"

**Invalid Reference**:
```json
{
  "version": 1,
  "exported_at": "2026-01-26T14:30:00.000Z",
  "app": "MemoryMate",
  "data": {
    "verses": [
      { "id": "verse-1", "reference": "John 3:16", "text": "...", "translation": "NIV", "created_at": "2026-01-01T00:00:00Z", "archived": false }
    ],
    "progress": [
      { "verse_id": "verse-2", ... }  // References non-existent verse
    ]
  }
}
```
Error: "Progress record references non-existent verse: verse-2"

---

## Testing Checklist

### Export Testing

- [ ] Export with no data (empty database)
- [ ] Export with 1 verse, no progress/tests
- [ ] Export with multiple verses and full data
- [ ] Export with archived verses included
- [ ] Export on web triggers download
- [ ] Export on iOS opens share sheet
- [ ] Export on Android opens share sheet
- [ ] Exported JSON is valid and formatted
- [ ] Exported JSON can be opened in text editor
- [ ] Timestamp in filename is correct

### Import Testing

- [ ] Import valid export file
- [ ] Import shows confirmation dialog
- [ ] Cancel import works (no changes)
- [ ] Import replaces existing data completely
- [ ] Import with empty arrays works
- [ ] Import with large dataset (100+ verses)
- [ ] Import updates UI after completion
- [ ] Import shows success message with counts

### Validation Testing

- [ ] Reject non-JSON file
- [ ] Reject JSON with wrong structure
- [ ] Reject wrong version number
- [ ] Reject wrong app name
- [ ] Reject missing required verse fields
- [ ] Reject invalid UUID format
- [ ] Reject invalid datetime format
- [ ] Reject invalid comfort_level (0, 6, etc.)
- [ ] Reject invalid score (<0 or >1)
- [ ] Reject times_correct > times_tested
- [ ] Reject progress with invalid verse_id reference
- [ ] Reject test result with invalid verse_id reference
- [ ] All validation errors show user-friendly messages

### Transaction Testing

- [ ] Import fails partway through → no data changed
- [ ] Database error during import → rollback works
- [ ] Import error leaves database in valid state
- [ ] Successful import atomically replaces all data

### Cross-Platform Testing

- [ ] Export on web, import on iOS
- [ ] Export on iOS, import on web
- [ ] Export on Android, import on web
- [ ] JSON format identical across platforms

### Edge Cases

- [ ] Import file with special characters in verses
- [ ] Import file with very long verse text (>10KB)
- [ ] Import file with 0.0 and 1.0 scores
- [ ] Import file with null last_practiced/last_tested
- [ ] Import file with mixed archived/active verses
- [ ] Import file with duplicate verse IDs → validation catches
- [ ] Import immediately after fresh export (round-trip)
- [ ] Multiple imports in sequence

### Web-Specific

- [ ] Web export creates downloadable file
- [ ] Web import file picker accepts .json only
- [ ] Web import triggers IndexedDB save
- [ ] After import, page reload shows imported data

### Native-Specific

- [ ] Native export saves to documents directory
- [ ] Native share sheet offers correct options
- [ ] Native import document picker works
- [ ] Import from iCloud/Google Drive works

---

## Platform Behavior Summary

| Feature | Web | Native (iOS/Android) |
|---------|-----|---------------------|
| **Export** | Browser download dialog | Share sheet (AirDrop, email, etc.) |
| **Import** | Browser file picker | Document picker (Files app) |
| **File location** | Downloads folder | App documents directory |
| **Sharing** | Manual (save, then share) | Direct from app via share sheet |
| **Persistence** | IndexedDB auto-saves after import | expo-sqlite file system |

---

## Security & Privacy Considerations

### Data Privacy
- All data stays on device (no cloud upload)
- Export files are unencrypted JSON (user responsible for security)
- Users should treat export files as sensitive (contains verse practice history)

### File Handling
- Only JSON files accepted on import
- No executable code in JSON (pure data)
- Validation prevents malicious data injection
- Transaction rollback protects against partial imports

### Best Practices
- Recommend users store exports securely
- Suggest using device encryption for exports
- Advise against sharing exports publicly (personal data)

---

## User Experience Considerations

### Export UX
- Fast operation (no loading spinner needed)
- Immediate feedback (alert on success)
- Clear filename with timestamp (easy to identify)
- Works offline (no network required)

### Import UX
- Clear warning before destructive action
- Confirmation dialog with "Cancel" option
- Loading state during import (may take 1-2s)
- Detailed success message (counts imported)
- Specific error messages (actionable)
- UI refreshes automatically after import

### Visual Feedback
- Disabled buttons during operations (prevent double-click)
- Loading text on buttons ("Exporting...", "Importing...")
- Alert dialogs for all outcomes
- Stats summary shows what will be replaced

---

## Future Enhancements (Out of Scope)

Not included in this implementation, but possible future additions:

1. **Incremental Import**: Merge data instead of replace
2. **Selective Import**: Choose which verses to import
3. **Export Filters**: Export only active verses, or date range
4. **Encrypted Exports**: Password-protected export files
5. **Cloud Sync**: Automatic backup to iCloud/Google Drive
6. **Export Scheduling**: Automatic periodic backups
7. **Version Migration**: Support importing from older versions
8. **CSV Export**: Alternative format for spreadsheet analysis
9. **Import Preview**: Show what will be imported before confirming
10. **Conflict Resolution**: Handle duplicate verses on import

---

## Known Limitations

1. **Replace-only Import**: Import replaces all data (no merge option)
2. **Version Locking**: Only version 1 supported (future versions need migration)
3. **File Size**: Very large exports (1000+ verses) may be slow on some devices
4. **No Undo**: After import, only way to undo is to import previous export
5. **Manual Sharing**: Web users must manually share exported files
6. **No Compression**: JSON is human-readable but not space-efficient

---

## Success Criteria

Part 2 is complete when:

- [ ] User can export all data as JSON file on both web and native
- [ ] User can import valid JSON file, replacing all data
- [ ] Invalid imports are rejected with clear error messages
- [ ] Import is transaction-safe (all-or-nothing)
- [ ] UI updates correctly after import
- [ ] Web platform persists imported data (IndexedDB)
- [ ] Native platforms persist imported data (file system)
- [ ] Export/import works across platforms (web ↔ native)
- [ ] All validation rules enforced
- [ ] All error cases handled gracefully
- [ ] Settings screen has intuitive UI for export/import
- [ ] Documentation is complete

---

## Implementation Time Estimate

**Note**: Estimates are for reference only. Focus on completing features correctly.

- Step 1 (Dependencies): 2 minutes
- Step 2 (dataExportService): 90-120 minutes
- Step 3 (Store updates): 20-30 minutes
- Step 4 (Settings UI): 60-90 minutes
- Step 5 (Testing): 45-60 minutes

**Total**: Approximately 3.5-5 hours

---

## Documentation Updates After Implementation

Update these files after Part 2 is complete:

1. **claude.md**: Update "Project Status" and "Tech Stack" sections
2. **ccc.00.active-context.md**: Update current phase status
3. **Create ccc.24.mvp-phase-4-addendum-part2-completion.md**: Document implementation
4. **memory-mate-mvp/README.md**: Add export/import to features list

---

**Plan prepared by**: Claude Code
**Model**: Sonnet 4.5
**Ready for implementation**: Yes ✅
