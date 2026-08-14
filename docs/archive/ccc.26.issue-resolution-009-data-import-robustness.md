# Plan: Make Data Import Robust Against Inconsistent Data (Issue 9)

## Problem Summary

**Current behavior**: Import fails completely if any progress or test_results record references a non-existent verse_id.

**Desired behavior**:
- Accept all valid data
- Warn about invalid/skipped records
- Only fail if there are NO valid verses in the JSON file

## Root Cause Analysis

In `dataExportService.ts`, the validation logic (lines 134-170) fails the entire import on the first invalid progress or test_results record:

```typescript
// Current code fails on FIRST invalid record
for (const progress of progressData) {
  const error = validateProgress(progress, verseIds);
  if (error) {
    return { success: false, ... error: `Invalid progress data: ${error}` };
  }
}
```

The `validateProgress()` and `validateTestResult()` functions check if `verse_id` exists in the `verseIds` set, and return an error if not (lines 333-335, 393-395).

## Implementation Approach

### 1. Update Data Structures

**File**: `memory-mate-mvp/src/services/dataExportService.ts`

Enhance `ImportResult` interface to include warnings:

```typescript
export interface ImportResult {
  success: boolean;
  versesImported: number;
  progressImported: number;
  testResultsImported: number;
  error?: string;
  warnings?: string[];  // NEW: Track skipped/invalid records
}
```

### 2. Refactor Validation Logic

Replace "fail-on-first-error" validation with "filter-and-warn" approach:

**Current flow**:
- Validate all records → Fail on first error → Return error

**New flow**:
- Validate verses (must have at least 1 valid verse)
- Filter progress records → Separate valid from invalid → Track warnings
- Filter test_results records → Separate valid from invalid → Track warnings
- Import only valid data → Return success with warnings

### 3. Specific Changes

#### A. Verse Validation (No change)
Keep existing strict validation for verses - must have at least one valid verse or fail.

#### B. Progress Validation (Refactor)
Replace lines 134-145 with filtering logic:

```typescript
// Filter valid progress records, collect warnings for invalid ones
const warnings: string[] = [];
const validProgress: VerseProgress[] = [];

for (const progress of progressData) {
  const error = validateProgress(progress, verseIds);
  if (error) {
    warnings.push(`Skipped progress record for verse_id ${progress.verse_id}: ${error}`);
  } else {
    validProgress.push(progress);
  }
}
```

#### C. Test Results Validation (Refactor)
Replace lines 148-170 with similar filtering logic:

```typescript
// Filter valid test results, collect warnings for invalid ones
const validTestResults: TestResult[] = [];
const testIds = new Set<string>();

for (const result of testResultsData) {
  const error = validateTestResult(result, verseIds);
  if (error) {
    warnings.push(`Skipped test result ${result.id}: ${error}`);
    continue;
  }

  // Check for duplicate test IDs among VALID results
  if (testIds.has(result.id)) {
    warnings.push(`Skipped duplicate test result ID: ${result.id}`);
    continue;
  }

  validTestResults.push(result);
  testIds.add(result.id);
}
```

#### D. Final Validation Check
After filtering, ensure at least one valid verse exists:

```typescript
if (versesData.length === 0) {
  return {
    success: false,
    versesImported: 0,
    progressImported: 0,
    testResultsImported: 0,
    error: 'No valid verses found in import file. Cannot import empty dataset.',
  };
}
```

#### E. Update Database Transaction
Use `validProgress` and `validTestResults` instead of full arrays (lines 191-211):

```typescript
// Insert only VALID progress records
for (const progress of validProgress) {
  await db.runAsync(...);
}

// Insert only VALID test results
for (const result of validTestResults) {
  await db.runAsync(...);
}
```

#### F. Return Result with Warnings
Update return statement (line 219-224):

```typescript
return {
  success: true,
  versesImported: versesData.length,
  progressImported: validProgress.length,
  testResultsImported: validTestResults.length,
  warnings: warnings.length > 0 ? warnings : undefined,
};
```

### 4. Update UI to Display Warnings

**File**: `memory-mate-mvp/src/app/(tabs)/settings.tsx`

Update the success alert (lines 102-105) to show warnings if present:

```typescript
const warningText = result.warnings && result.warnings.length > 0
  ? `\n\n⚠️ Warnings:\n${result.warnings.slice(0, 5).map(w => `• ${w}`).join('\n')}${result.warnings.length > 5 ? `\n... and ${result.warnings.length - 5} more` : ''}`
  : '';

Alert.alert(
  'Import Successful',
  `Imported:\n• ${result.versesImported} verses\n• ${result.progressImported} progress records\n• ${result.testResultsImported} test results${warningText}`
);
```

## Critical Files to Modify

1. `memory-mate-mvp/src/services/dataExportService.ts` - Core import logic
2. `memory-mate-mvp/src/app/(tabs)/settings.tsx` - UI display of import results

## Edge Cases Handled

1. **All progress records invalid**: Import succeeds with verses, 0 progress, warnings shown
2. **All test results invalid**: Import succeeds with verses, 0 test results, warnings shown
3. **No valid verses**: Import fails with clear error message
4. **Mixed valid/invalid data**: Import succeeds with valid data, warnings for invalid data
5. **Duplicate test IDs among valid results**: Skip duplicates with warning
6. **Empty arrays**: No warnings, counts show 0

## Testing Strategy

### Manual Testing

1. **Test Case 1: Inconsistent progress data**
   - Export current data
   - Manually edit JSON: change a progress.verse_id to a non-existent UUID
   - Import → Should succeed with warning about skipped progress record

2. **Test Case 2: Inconsistent test_results data**
   - Export current data
   - Manually edit JSON: change a test_result.verse_id to a non-existent UUID
   - Import → Should succeed with warning about skipped test result

3. **Test Case 3: Multiple invalid records**
   - Create JSON with 3 verses, 2 valid progress records, 3 invalid progress records
   - Import → Should succeed importing 3 verses, 2 progress, showing 3 warnings

4. **Test Case 4: No valid verses**
   - Create JSON with all verses having invalid data (missing fields)
   - Import → Should fail with "No valid verses" error

5. **Test Case 5: Clean data (regression test)**
   - Export current data without modifications
   - Import → Should succeed with no warnings

### Verification Checklist

- [ ] Import succeeds when some progress records have invalid verse_ids
- [ ] Import succeeds when some test_results have invalid verse_ids
- [ ] Warnings are displayed in the UI
- [ ] Valid data is imported correctly
- [ ] Invalid data is skipped
- [ ] Import fails only when no valid verses exist
- [ ] Transaction safety maintained (all-or-nothing for valid data)
- [ ] No console errors during import
- [ ] UI shows correct counts and warnings

## Implementation Order

1. Update `ImportResult` interface with warnings field
2. Refactor progress validation to filter + warn
3. Refactor test results validation to filter + warn
4. Add "no valid verses" check
5. Update database transaction to use filtered arrays
6. Update return statement to include warnings
7. Update UI to display warnings
8. Manual testing with test cases above

## Notes

- Verse validation remains strict (must be valid)
- Progress and test_results validation becomes lenient (skip invalid, warn)
- Transaction safety preserved - valid data is imported atomically
- Warnings capped at 5 in UI to avoid overwhelming the user
- Issue 8 (root cause of inconsistent data) deferred as requested
