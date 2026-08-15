# Issue Resolution 008: Data Only Partially Deleted

**Issue**: Deleting a verse does not remove the corresponding verse_id entry from the 'progress' data. Unsure if it deletes the corresponding entry from the 'test_results' data.

**Date**: 2026-01-31
**Status**: Investigation Complete - Ready for Implementation

---

## Investigation Summary

### Current Behavior
When a user deletes a verse using the "Remove Verse" button, the verse is deleted from the database, but:
- Progress entries for that verse_id may remain in the `progress` table
- Test result entries for that verse_id may remain in the `test_results` table

This creates orphaned data that can cause issues during data import (as noted in Issue 9).

### Root Cause Analysis

After reviewing the codebase, I identified the following:

#### 1. Database Schema (Correctly Configured)
**File**: `memory-mate-mvp/src/services/database.ts`

The database schema correctly defines foreign key constraints with cascade delete:
- **Line 79**: `FOREIGN KEY (verse_id) REFERENCES verses(id) ON DELETE CASCADE` (progress table)
- **Line 90**: `FOREIGN KEY (verse_id) REFERENCES verses(id) ON DELETE CASCADE` (test_results table)

#### 2. Foreign Keys Enabled (But Potentially Not Persistent)
**File**: `memory-mate-mvp/src/services/database.ts:56`

The `initDatabase()` function enables foreign keys:
```typescript
await db.execAsync('PRAGMA foreign_keys = ON;');
```

**HOWEVER**, this has a critical limitation:
- **In SQLite, the `PRAGMA foreign_keys` setting is per-connection, not per-database**
- The setting does NOT persist when the database is saved/restored
- The pragma must be set every time a connection is opened

#### 3. Current Deletion Implementation
**File**: `memory-mate-mvp/src/services/verseService.ts:115-118`

```typescript
export async function removeVerse(id: string): Promise<boolean> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM verses WHERE id = ?', [id]);
  return true;
}
```

The comment says "(cascades to progress and test results)" but relies entirely on the database's foreign key constraints.

#### 4. UI State Management (Working Around the Issue)
**File**: `memory-mate-mvp/src/store/verseStore.ts:189-208`

The Zustand store manually removes progress from the UI state:
```typescript
removeVerse: async (id) => {
  await verseService.removeVerse(id);
  set((state) => ({
    verses: state.verses.filter((v) => v.id !== id),
    progress: Object.fromEntries(
      Object.entries(state.progress).filter(([key]) => key !== id)
    ),
  }));
  await get().refreshStats();
}
```

This cleans up the UI but doesn't address the underlying database issue.

---

## Platform-Specific Considerations

### Web Platform (sql.js)
**File**: `memory-mate-mvp/src/services/webDatabase.ts`

When restoring a database from IndexedDB:
1. `openWebDatabase()` creates a new Database instance from the saved blob (line 46)
2. Control returns to `initDatabase()` which sets `PRAGMA foreign_keys = ON;` (line 56)
3. This should work, but **the blob was saved WITHOUT the pragma active**, so the cascade might not be retroactively applied to the restored database

### Native Platform (expo-sqlite)
The native SQLite connection might:
- Be closed and reopened without re-running `initDatabase()`
- Not have the pragma set if the connection is reused

---

## Proposed Solution

### Approach 1: Explicit Cascade Deletes (RECOMMENDED)
Replace reliance on database cascades with explicit deletion in the service layer.

**Rationale**:
- More reliable across all platforms
- More transparent and easier to debug
- Provides explicit control over deletion order
- Matches the pattern already used in `resetProgress()` (progressService.ts:103-111)

**Changes Required**:

#### File: `memory-mate-mvp/src/services/verseService.ts`

**Before** (lines 115-118):
```typescript
export async function removeVerse(id: string): Promise<boolean> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM verses WHERE id = ?', [id]);
  return true;
}
```

**After**:
```typescript
export async function removeVerse(id: string): Promise<boolean> {
  const db = getDatabase();

  // Use transaction to ensure all-or-nothing deletion
  await db.withTransactionAsync(async () => {
    // Delete in order: test_results -> progress -> verse
    // (following foreign key dependency order)
    await db.runAsync('DELETE FROM test_results WHERE verse_id = ?', [id]);
    await db.runAsync('DELETE FROM progress WHERE verse_id = ?', [id]);
    await db.runAsync('DELETE FROM verses WHERE id = ?', [id]);
  });

  return true;
}
```

**Benefits**:
- Explicit and predictable behavior
- Works identically on all platforms
- Transaction ensures data consistency
- No orphaned records
- Matches existing pattern in `resetProgress()`

---

### Approach 2: Ensure Foreign Keys Are Always Enabled (COMPLEMENTARY)
Even if we implement explicit deletes, we should ensure foreign keys work correctly for data integrity.

**Changes Required**:

#### File: `memory-mate-mvp/src/services/webDatabase.ts`

Add pragma immediately after database creation/restoration:

**Before** (lines 44-47):
```typescript
// Initialize database from saved blob or create new empty database
const sqlDb = savedBlob
  ? new SQL.Database(savedBlob)
  : new SQL.Database();
```

**After**:
```typescript
// Initialize database from saved blob or create new empty database
const sqlDb = savedBlob
  ? new SQL.Database(savedBlob)
  : new SQL.Database();

// CRITICAL: Foreign keys must be enabled for EVERY connection
// This pragma does not persist in the saved blob
sqlDb.run('PRAGMA foreign_keys = ON;');
```

#### File: `memory-mate-mvp/src/services/database.ts`

Document the pragma behavior more clearly:

**Before** (line 55-56):
```typescript
// Enable foreign keys
await db.execAsync('PRAGMA foreign_keys = ON;');
```

**After**:
```typescript
// CRITICAL: Enable foreign keys for this connection
// In SQLite, this pragma is per-connection and does NOT persist in the database file
// Must be set every time a connection is opened
await db.execAsync('PRAGMA foreign_keys = ON;');
```

---

## Testing Plan

### 1. Manual Testing
1. Add a verse with some practice/test history
2. Delete the verse
3. **Verify using database inspection**:
   - No entry in `progress` table with that verse_id
   - No entries in `test_results` table with that verse_id
4. Test on both:
   - Web platform (sql.js)
   - Native platform (if available)

### 2. Database Inspection Queries
Add these queries to verify deletion:
```sql
-- After deleting verse with id 'abc-123':
SELECT COUNT(*) FROM progress WHERE verse_id = 'abc-123';  -- Should return 0
SELECT COUNT(*) FROM test_results WHERE verse_id = 'abc-123';  -- Should return 0
SELECT COUNT(*) FROM verses WHERE id = 'abc-123';  -- Should return 0
```

### 3. Import/Export Testing
1. Create a verse and add progress/test results
2. Export data
3. Delete the verse
4. Re-import the data
5. Verify the verse and all related data is restored correctly
6. Delete again and verify cleanup

### 4. Verification with Issue 9
This fix will help resolve Issue 9 (import fails with invalid verse_id references) by ensuring:
- No orphaned progress entries are created
- Export files don't contain orphaned data
- Import validation is simpler

---

## Implementation Steps

### Step 1: Update verseService.removeVerse() with explicit deletes
**File**: `memory-mate-mvp/src/services/verseService.ts:115-118`
**Priority**: HIGH (fixes the core issue)

### Step 2: Add PRAGMA to webDatabase.ts
**File**: `memory-mate-mvp/src/services/webDatabase.ts:44-47`
**Priority**: MEDIUM (belt-and-suspenders, improves data integrity)

### Step 3: Update documentation in database.ts
**File**: `memory-mate-mvp/src/services/database.ts:55-56`
**Priority**: LOW (documentation only)

### Step 4: Test thoroughly
- Manual testing on web
- Database inspection
- Import/export cycle testing

---

## Risk Assessment

### Low Risk
- **Explicit deletion is already used in `resetProgress()`** (progressService.ts:107-108)
- Transaction ensures atomicity
- Matches SQLite best practices
- More predictable than relying on cascade behavior

### Potential Issues
- **None identified** - this is a straightforward fix
- Existing UI state cleanup (verseStore.ts:196-198) will continue to work
- Transaction ensures no partial deletions occur

---

## Related Issues

### Issue 9: Import Data Robustness
This fix will help prevent the creation of orphaned data that causes import failures. However, Issue 9 still needs to be addressed to handle existing invalid data in import files.

### Future Considerations
- Consider adding database integrity checks on app startup
- Consider adding a "Clean up orphaned data" maintenance function
- Consider adding database migration system for schema updates

---

## References

### Code Locations

**Deletion Logic**:
- `memory-mate-mvp/src/services/verseService.ts:115-118` - `removeVerse()` function
- `memory-mate-mvp/src/store/verseStore.ts:189-208` - UI state cleanup

**Database Schema**:
- `memory-mate-mvp/src/services/database.ts:59-92` - Table definitions with foreign keys
- `memory-mate-mvp/src/services/database.ts:56` - PRAGMA foreign_keys

**Web Platform**:
- `memory-mate-mvp/src/services/webDatabase.ts:33-47` - Database restoration from blob

**Related Patterns**:
- `memory-mate-mvp/src/services/progressService.ts:103-111` - `resetProgress()` (similar explicit deletion pattern)

### SQLite Documentation
- Foreign key constraints: https://www.sqlite.org/foreignkeys.html
- PRAGMA foreign_keys: https://www.sqlite.org/pragma.html#pragma_foreign_keys
- Transactions: https://www.sqlite.org/lang_transaction.html

---

## Conclusion

**Root Cause**: Deletion relies on database CASCADE behavior, but SQLite's `PRAGMA foreign_keys` is per-connection and may not be active consistently across platforms.

**Solution**: Implement explicit cascade deletion in `verseService.removeVerse()` using a transaction to ensure all related data (test_results, progress, verse) is deleted atomically.

**Confidence**: HIGH - This pattern is already used successfully in `resetProgress()` and follows SQLite best practices.

**Estimated Effort**: 30 minutes (simple code change + testing)
