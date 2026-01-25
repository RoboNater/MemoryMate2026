# MVP Implementation Phase 4 Detailed Plan

**Date**: 2026-01-25
**Phase**: Phase 4 - Data Layer Integration
**Goal**: Replace mock data with real SQLite storage and Zustand state management

---

## Overview

Phase 4 transforms the interactive prototype (Phase 3) into a functional app with persistent data storage. We will:

1. Implement SQLite database with expo-sqlite
2. Create a data service layer mirroring the Python prototype API
3. Build a Zustand store for reactive state management
4. Connect all UI screens to the store, replacing mock data imports
5. Add loading and error states for a polished user experience

---

## Prerequisites

### Already Completed in Phase 3
- TypeScript types defined in [src/types/index.ts](memory-mate-mvp/src/types/index.ts)
- All 12 screens fully functional with mock data
- Mock data helpers demonstrating the queries we need
- 8 UI components ready to consume store data

### Dependencies Already Installed
- `expo-sqlite` (16.0) - SQLite database
- `zustand` (5.0) - State management

---

## Implementation Tasks

### Task 1: SQLite Database Service

**File**: `src/services/database.ts`

Create the database initialization and schema management.

#### Schema Design

```sql
-- Verses table
CREATE TABLE IF NOT EXISTS verses (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL,
  text TEXT NOT NULL,
  translation TEXT NOT NULL DEFAULT 'NIV',
  created_at TEXT NOT NULL,
  archived INTEGER NOT NULL DEFAULT 0
);

-- Progress table
CREATE TABLE IF NOT EXISTS progress (
  verse_id TEXT PRIMARY KEY,
  times_practiced INTEGER NOT NULL DEFAULT 0,
  times_tested INTEGER NOT NULL DEFAULT 0,
  times_correct INTEGER NOT NULL DEFAULT 0,
  last_practiced TEXT,
  last_tested TEXT,
  comfort_level INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (verse_id) REFERENCES verses(id) ON DELETE CASCADE
);

-- Test results table
CREATE TABLE IF NOT EXISTS test_results (
  id TEXT PRIMARY KEY,
  verse_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  passed INTEGER NOT NULL,
  score REAL,
  FOREIGN KEY (verse_id) REFERENCES verses(id) ON DELETE CASCADE
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_test_results_verse_id ON test_results(verse_id);
CREATE INDEX IF NOT EXISTS idx_test_results_timestamp ON test_results(timestamp);
```

#### Implementation Details

```typescript
// src/services/database.ts

import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'memory_mate.db';
const DATABASE_VERSION = 1;

// Database instance (singleton)
let db: SQLite.SQLiteDatabase | null = null;

// Initialize database
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  // Enable foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Create tables
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS verses (...);
    CREATE TABLE IF NOT EXISTS progress (...);
    CREATE TABLE IF NOT EXISTS test_results (...);
    -- Indexes...
  `);

  return db;
}

// Get database instance
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) throw new Error('Database not initialized');
  return db;
}
```

#### Notes
- Use expo-sqlite's async API (not deprecated sync methods)
- Enable foreign keys for cascade deletes
- Use TEXT for dates (ISO 8601 strings) for simplicity
- Use INTEGER (0/1) for booleans (SQLite convention)

---

### Task 2: Verse Service Layer

**File**: `src/services/verseService.ts`

Mirror the Python prototype `MemoryMateStore` methods.

#### Methods to Implement

| Method | Python Equivalent | Description |
|--------|-------------------|-------------|
| `addVerse(reference, text, translation)` | `add_verse()` | Add new verse with UUID |
| `getVerse(id)` | `get_verse()` | Get single verse by ID |
| `getAllVerses(includeArchived?)` | `get_all_verses()` | Get all verses, optionally with archived |
| `updateVerse(id, updates)` | `update_verse()` | Update verse fields |
| `removeVerse(id)` | `remove_verse()` | Delete verse (cascades) |
| `archiveVerse(id)` | `archive_verse()` | Soft delete |
| `unarchiveVerse(id)` | `unarchive_verse()` | Restore from archive |

#### Implementation Pattern

```typescript
// src/services/verseService.ts

import { getDatabase } from './database';
import { Verse } from '@/types';
import * as Crypto from 'expo-crypto';

export async function addVerse(
  reference: string,
  text: string,
  translation: string = 'NIV'
): Promise<Verse> {
  const db = getDatabase();
  const id = Crypto.randomUUID();
  const created_at = new Date().toISOString();

  await db.runAsync(
    'INSERT INTO verses (id, reference, text, translation, created_at, archived) VALUES (?, ?, ?, ?, ?, ?)',
    [id, reference, text, translation, created_at, 0]
  );

  return { id, reference, text, translation, created_at, archived: false };
}

export async function getVerse(id: string): Promise<Verse | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<VerseRow>(
    'SELECT * FROM verses WHERE id = ?',
    [id]
  );
  return row ? rowToVerse(row) : null;
}

export async function getAllVerses(includeArchived = false): Promise<Verse[]> {
  const db = getDatabase();
  const query = includeArchived
    ? 'SELECT * FROM verses ORDER BY created_at DESC'
    : 'SELECT * FROM verses WHERE archived = 0 ORDER BY created_at DESC';
  const rows = await db.getAllAsync<VerseRow>(query);
  return rows.map(rowToVerse);
}

// ... additional methods
```

#### Helper Functions

```typescript
// Row type from SQLite (uses number for boolean)
interface VerseRow {
  id: string;
  reference: string;
  text: string;
  translation: string;
  created_at: string;
  archived: number; // 0 or 1
}

// Convert SQLite row to Verse type
function rowToVerse(row: VerseRow): Verse {
  return {
    ...row,
    archived: row.archived === 1,
  };
}
```

---

### Task 3: Progress Service Layer

**File**: `src/services/progressService.ts`

Handle verse progress tracking.

#### Methods to Implement

| Method | Python Equivalent | Description |
|--------|-------------------|-------------|
| `getProgress(verseId)` | `get_progress()` | Get progress for a verse |
| `recordPractice(verseId)` | `record_practice()` | Increment practice count |
| `setComfortLevel(verseId, level)` | `set_comfort_level()` | Set comfort 1-5 |
| `resetProgress(verseId)` | `reset_progress()` | Reset all progress |

#### Implementation Details

```typescript
// src/services/progressService.ts

export async function recordPractice(verseId: string): Promise<boolean> {
  const db = getDatabase();
  const now = new Date().toISOString();

  // Upsert pattern: insert if not exists, update if exists
  await db.runAsync(`
    INSERT INTO progress (verse_id, times_practiced, last_practiced, comfort_level)
    VALUES (?, 1, ?, 1)
    ON CONFLICT(verse_id) DO UPDATE SET
      times_practiced = times_practiced + 1,
      last_practiced = ?
  `, [verseId, now, now]);

  return true;
}

export async function setComfortLevel(
  verseId: string,
  level: 1 | 2 | 3 | 4 | 5
): Promise<boolean> {
  const db = getDatabase();
  const now = new Date().toISOString();

  // Upsert: create progress if doesn't exist, update comfort level
  await db.runAsync(`
    INSERT INTO progress (verse_id, comfort_level)
    VALUES (?, ?)
    ON CONFLICT(verse_id) DO UPDATE SET
      comfort_level = ?
  `, [verseId, level, level]);

  return true;
}
```

---

### Task 4: Test Results Service Layer

**File**: `src/services/testService.ts`

Handle test result recording and retrieval.

#### Methods to Implement

| Method | Python Equivalent | Description |
|--------|-------------------|-------------|
| `recordTestResult(verseId, passed, score?)` | `record_test_result()` | Record test attempt |
| `getTestHistory(verseId?, limit?)` | `get_test_history()` | Get test results |

#### Implementation Details

```typescript
// src/services/testService.ts

export async function recordTestResult(
  verseId: string,
  passed: boolean,
  score?: number
): Promise<TestResult> {
  const db = getDatabase();
  const id = Crypto.randomUUID();
  const timestamp = new Date().toISOString();

  // Insert test result
  await db.runAsync(
    'INSERT INTO test_results (id, verse_id, timestamp, passed, score) VALUES (?, ?, ?, ?, ?)',
    [id, verseId, timestamp, passed ? 1 : 0, score ?? null]
  );

  // Update progress
  await db.runAsync(`
    INSERT INTO progress (verse_id, times_tested, times_correct, last_tested)
    VALUES (?, 1, ?, ?)
    ON CONFLICT(verse_id) DO UPDATE SET
      times_tested = times_tested + 1,
      times_correct = times_correct + ?,
      last_tested = ?
  `, [verseId, passed ? 1 : 0, timestamp, passed ? 1 : 0, timestamp]);

  return { id, verse_id: verseId, timestamp, passed, score };
}
```

---

### Task 5: Statistics Service Layer

**File**: `src/services/statsService.ts`

Compute overall and per-verse statistics.

#### Methods to Implement

| Method | Python Equivalent | Description |
|--------|-------------------|-------------|
| `getOverallStats()` | `get_stats()` | Aggregate stats |
| `getVerseStats(verseId)` | `get_verse_stats()` | Per-verse stats |

#### Implementation Details

```typescript
// src/services/statsService.ts

export async function getOverallStats(): Promise<OverallStats> {
  const db = getDatabase();

  // Get verse counts
  const verseCounts = await db.getFirstAsync<{
    total: number;
    active: number;
    archived: number;
  }>(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN archived = 0 THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN archived = 1 THEN 1 ELSE 0 END) as archived
    FROM verses
  `);

  // Get practice/test totals
  const progressTotals = await db.getFirstAsync<{
    total_practiced: number;
    total_tested: number;
    total_correct: number;
  }>(`
    SELECT
      COALESCE(SUM(times_practiced), 0) as total_practiced,
      COALESCE(SUM(times_tested), 0) as total_tested,
      COALESCE(SUM(times_correct), 0) as total_correct
    FROM progress
  `);

  // Get comfort level distribution
  const comfortDist = await db.getAllAsync<{
    comfort_level: number;
    count: number;
  }>(`
    SELECT comfort_level, COUNT(*) as count
    FROM progress
    GROUP BY comfort_level
  `);

  // Build verses_by_comfort object
  const verses_by_comfort = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of comfortDist) {
    verses_by_comfort[row.comfort_level as 1|2|3|4|5] = row.count;
  }

  // Calculate accuracy
  const overall_accuracy = progressTotals.total_tested > 0
    ? progressTotals.total_correct / progressTotals.total_tested
    : 0;

  // Calculate average comfort
  const totalComfort = Object.entries(verses_by_comfort)
    .reduce((sum, [level, count]) => sum + Number(level) * count, 0);
  const totalWithProgress = Object.values(verses_by_comfort).reduce((a, b) => a + b, 0);
  const average_comfort = totalWithProgress > 0 ? totalComfort / totalWithProgress : 0;

  return {
    total_verses: verseCounts.total,
    active_verses: verseCounts.active,
    archived_verses: verseCounts.archived,
    total_practiced: progressTotals.total_practiced,
    total_tested: progressTotals.total_tested,
    total_correct: progressTotals.total_correct,
    overall_accuracy,
    verses_by_comfort,
    average_comfort,
  };
}
```

---

### Task 6: Service Index File

**File**: `src/services/index.ts`

Export all service functions for easy import.

```typescript
// src/services/index.ts

export * from './database';
export * from './verseService';
export * from './progressService';
export * from './testService';
export * from './statsService';
```

---

### Task 7: Zustand Store Implementation

**File**: `src/store/verseStore.ts`

Create reactive state management using Zustand.

#### Store Design

```typescript
// src/store/verseStore.ts

import { create } from 'zustand';
import { Verse, VerseProgress, OverallStats, VerseStats, TestResult } from '@/types';
import * as verseService from '@/services/verseService';
import * as progressService from '@/services/progressService';
import * as testService from '@/services/testService';
import * as statsService from '@/services/statsService';

interface VerseStore {
  // State
  verses: Verse[];
  progress: Record<string, VerseProgress>;
  stats: OverallStats | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;

  // Initialization
  initialize: () => Promise<void>;

  // Verse actions
  addVerse: (reference: string, text: string, translation: string) => Promise<Verse>;
  updateVerse: (id: string, updates: Partial<Verse>) => Promise<void>;
  archiveVerse: (id: string) => Promise<void>;
  unarchiveVerse: (id: string) => Promise<void>;
  removeVerse: (id: string) => Promise<void>;

  // Practice/Test actions
  recordPractice: (verseId: string) => Promise<void>;
  setComfortLevel: (verseId: string, level: 1|2|3|4|5) => Promise<void>;
  resetProgress: (verseId: string) => Promise<void>;
  recordTestResult: (verseId: string, passed: boolean, score?: number) => Promise<TestResult>;

  // Data fetching
  refreshVerses: () => Promise<void>;
  refreshStats: () => Promise<void>;
  getVerseStats: (verseId: string) => Promise<VerseStats | null>;
  getTestHistory: (verseId: string) => Promise<TestResult[]>;

  // Computed getters (derived state)
  getActiveVerses: () => Verse[];
  getArchivedVerses: () => Verse[];
  getVersesNeedingPractice: () => Verse[];
  getVersesReadyForTest: () => Verse[];
}

export const useVerseStore = create<VerseStore>((set, get) => ({
  // Initial state
  verses: [],
  progress: {},
  stats: null,
  isLoading: false,
  error: null,
  isInitialized: false,

  // Initialize database and load data
  initialize: async () => {
    if (get().isInitialized) return;

    set({ isLoading: true, error: null });
    try {
      await initDatabase();

      // Load all verses and progress
      const verses = await verseService.getAllVerses(true);
      const progressList = await progressService.getAllProgress();
      const progress = Object.fromEntries(
        progressList.map(p => [p.verse_id, p])
      );
      const stats = await statsService.getOverallStats();

      set({ verses, progress, stats, isInitialized: true });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ isLoading: false });
    }
  },

  // Add a new verse
  addVerse: async (reference, text, translation) => {
    set({ isLoading: true, error: null });
    try {
      const verse = await verseService.addVerse(reference, text, translation);
      set(state => ({
        verses: [verse, ...state.verses],
        progress: {
          ...state.progress,
          [verse.id]: {
            verse_id: verse.id,
            times_practiced: 0,
            times_tested: 0,
            times_correct: 0,
            last_practiced: null,
            last_tested: null,
            comfort_level: 1,
          },
        },
      }));
      // Refresh stats
      await get().refreshStats();
      return verse;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add verse' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // ... additional actions follow same pattern

  // Computed getters
  getActiveVerses: () => get().verses.filter(v => !v.archived),
  getArchivedVerses: () => get().verses.filter(v => v.archived),
  getVersesNeedingPractice: () => {
    const { verses, progress } = get();
    return verses.filter(v => {
      if (v.archived) return false;
      const p = progress[v.id];
      return !p || p.comfort_level <= 3;
    });
  },
  getVersesReadyForTest: () => {
    const { verses, progress } = get();
    return verses.filter(v => {
      if (v.archived) return false;
      const p = progress[v.id];
      return p && p.comfort_level >= 3;
    });
  },
}));
```

#### Store Index

**File**: `src/store/index.ts`

```typescript
export { useVerseStore } from './verseStore';
```

---

### Task 8: App Initialization

**File**: Update `src/app/_layout.tsx`

Initialize the database and store when the app starts.

```typescript
// In src/app/_layout.tsx

import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useVerseStore } from '@/store';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const { initialize, isLoading, error } = useVerseStore();

  useEffect(() => {
    async function init() {
      try {
        await initialize();
        setIsReady(true);
      } catch (e) {
        console.error('Failed to initialize:', e);
      }
    }
    init();
  }, []);

  if (!isReady || isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="mt-4 text-gray-600">Loading Memory Mate...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-6">
        <Text className="text-red-500 text-lg font-semibold mb-2">
          Failed to load
        </Text>
        <Text className="text-gray-600 text-center">{error}</Text>
      </View>
    );
  }

  return (
    // ... existing layout code
  );
}
```

---

### Task 9: Update Screen Components

Replace mock data imports with Zustand store hooks in all screens.

#### Pattern: Before (Mock Data)

```typescript
// BEFORE - using mock data
import { mockVerses, mockProgress, mockOverallStats } from '@/utils/mockData';

export default function HomeScreen() {
  const stats = mockOverallStats;
  // ...
}
```

#### Pattern: After (Store)

```typescript
// AFTER - using Zustand store
import { useVerseStore } from '@/store';

export default function HomeScreen() {
  const { stats, verses, progress, isLoading } = useVerseStore();

  if (isLoading || !stats) {
    return <LoadingSpinner />;
  }
  // ...
}
```

#### Screens to Update

| Screen | File | Changes Required |
|--------|------|------------------|
| Home/Dashboard | `src/app/(tabs)/index.tsx` | Replace `mockOverallStats`, `mockVerses`, `mockProgress` |
| Verse List | `src/app/(tabs)/verses.tsx` | Replace `mockVerses`, `mockProgress`, filter functions |
| Practice Selection | `src/app/(tabs)/practice.tsx` | Replace verse lists and progress |
| Test Selection | `src/app/(tabs)/test.tsx` | Replace verse lists and progress |
| Verse Detail | `src/app/verse/[id]/index.tsx` | Use `getVerse`, `getVerseStats`, `getTestHistory` |
| Add Verse | `src/app/verse/add.tsx` | Call `addVerse` action |
| Edit Verse | `src/app/verse/[id]/edit.tsx` | Call `updateVerse` action |
| Practice Verse | `src/app/practice/[id].tsx` | Call `recordPractice`, `setComfortLevel` |
| Test Verse | `src/app/test/[id].tsx` | Call `recordTestResult` |

---

### Task 10: Add Loading States

Create a reusable loading component and add to all screens.

**File**: `src/components/LoadingSpinner.tsx`

```typescript
import { View, ActivityIndicator, Text } from 'react-native';

interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <View className="flex-1 items-center justify-center bg-gray-50">
      <ActivityIndicator size="large" color="#3B82F6" />
      <Text className="mt-4 text-gray-600">{message}</Text>
    </View>
  );
}
```

---

### Task 11: Add Error Handling

Create error boundary and error display components.

**File**: `src/components/ErrorDisplay.tsx`

```typescript
import { View, Text, TouchableOpacity } from 'react-native';

interface ErrorDisplayProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorDisplay({ message, onRetry }: ErrorDisplayProps) {
  return (
    <View className="flex-1 items-center justify-center bg-gray-50 p-6">
      <Text className="text-red-500 text-lg font-semibold mb-2">
        Something went wrong
      </Text>
      <Text className="text-gray-600 text-center mb-4">{message}</Text>
      {onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          className="bg-blue-500 px-6 py-3 rounded-lg"
        >
          <Text className="text-white font-semibold">Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
```

---

### Task 12: Test Data Persistence

Manual testing scenarios to verify everything works.

#### Test Checklist

| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Fresh install | Clear app data, launch | Empty state displayed |
| Add verse | Add new verse via form | Verse appears in list, persists after restart |
| Edit verse | Modify verse text | Changes persist after restart |
| Archive verse | Archive from detail screen | Verse hidden from active list, visible when showing archived |
| Unarchive verse | Restore from archived view | Verse returns to active list |
| Delete verse | Delete from detail screen | Verse removed, cascade deletes progress/test results |
| Record practice | Practice a verse | `times_practiced` increments, `last_practiced` updates |
| Set comfort level | Change comfort on practice screen | Comfort level persists |
| Reset progress | Reset from detail screen | Progress zeroed, test history cleared |
| Record test (pass) | Complete test, mark passed | `times_tested` and `times_correct` increment |
| Record test (fail) | Complete test, mark failed | `times_tested` increments, `times_correct` unchanged |
| Statistics | Check dashboard | Counts match actual data |

---

## File Structure After Phase 4

```
memory-mate-mvp/
├── src/
│   ├── app/                      # Expo Router pages (updated)
│   │   ├── _layout.tsx           # ✏️ Add initialization
│   │   ├── (tabs)/
│   │   │   ├── index.tsx         # ✏️ Connect to store
│   │   │   ├── verses.tsx        # ✏️ Connect to store
│   │   │   ├── practice.tsx      # ✏️ Connect to store
│   │   │   ├── test.tsx          # ✏️ Connect to store
│   │   │   └── settings.tsx      # No changes
│   │   ├── verse/
│   │   │   ├── add.tsx           # ✏️ Call addVerse
│   │   │   └── [id]/
│   │   │       ├── index.tsx     # ✏️ Connect to store
│   │   │       └── edit.tsx      # ✏️ Call updateVerse
│   │   ├── practice/
│   │   │   └── [id].tsx          # ✏️ Call recordPractice, setComfortLevel
│   │   └── test/
│   │       └── [id].tsx          # ✏️ Call recordTestResult
│   │
│   ├── components/               # UI components
│   │   ├── index.ts              # ✏️ Export new components
│   │   ├── LoadingSpinner.tsx    # ✨ NEW
│   │   ├── ErrorDisplay.tsx      # ✨ NEW
│   │   └── ... (existing)
│   │
│   ├── services/                 # ✨ NEW - Data access layer
│   │   ├── index.ts              # Service exports
│   │   ├── database.ts           # SQLite initialization
│   │   ├── verseService.ts       # Verse CRUD operations
│   │   ├── progressService.ts    # Progress tracking
│   │   ├── testService.ts        # Test result management
│   │   └── statsService.ts       # Statistics calculations
│   │
│   ├── store/                    # ✨ NEW - State management
│   │   ├── index.ts              # Store exports
│   │   └── verseStore.ts         # Main Zustand store
│   │
│   ├── types/
│   │   └── index.ts              # No changes (already complete)
│   │
│   └── utils/
│       └── mockData.ts           # ⚠️ Keep for reference, but unused
```

Legend: ✨ NEW | ✏️ MODIFIED | ⚠️ DEPRECATED

---

## Implementation Order

Execute tasks in this order to minimize integration issues:

### Phase 4a: Database & Services (No UI Changes)
1. **Task 1**: Create `database.ts` with schema
2. **Task 2**: Implement `verseService.ts`
3. **Task 3**: Implement `progressService.ts`
4. **Task 4**: Implement `testService.ts`
5. **Task 5**: Implement `statsService.ts`
6. **Task 6**: Create `services/index.ts`

### Phase 4b: Store Implementation
7. **Task 7**: Create `verseStore.ts` with all actions

### Phase 4c: UI Integration
8. **Task 8**: Update `_layout.tsx` with initialization
9. **Task 9**: Update screens one by one (start with simplest)
10. **Task 10**: Add `LoadingSpinner` component
11. **Task 11**: Add `ErrorDisplay` component

### Phase 4d: Testing
12. **Task 12**: Manual testing of all persistence scenarios

---

## Checkpoint 4 (CP-4) Verification

### Review Criteria

| Item | Status | Notes |
|------|--------|-------|
| SQLite database initializes | [ ] | No errors on app launch |
| Add verse persists | [ ] | Visible after app restart |
| Edit verse persists | [ ] | Changes saved correctly |
| Archive/unarchive persists | [ ] | State maintained |
| Delete verse cascades | [ ] | Progress and test results also deleted |
| Practice recording works | [ ] | Counter increments, timestamp updates |
| Comfort level persists | [ ] | Level saved correctly |
| Reset progress works | [ ] | Progress zeroed, history cleared |
| Test result recording works | [ ] | Pass/fail tracked correctly |
| Statistics calculate correctly | [ ] | Numbers match reality |
| Loading states display | [ ] | Spinner shown during load |
| Error states display | [ ] | Errors handled gracefully |

### Testing Scenarios

1. **Fresh Install Test**
   - Clear app data
   - Launch app
   - Verify empty state displays correctly

2. **Basic CRUD Test**
   - Add 3 verses
   - Edit one verse
   - Archive one verse
   - Delete one verse
   - Close and reopen app
   - Verify state matches expectations

3. **Practice Flow Test**
   - Add a verse
   - Practice it 3 times
   - Change comfort level to 3
   - Verify progress persisted

4. **Test Flow Test**
   - Take a test and pass
   - Take a test and fail
   - Verify counts are correct
   - Verify test history accessible

5. **Statistics Test**
   - With several verses and varied progress
   - Verify dashboard stats are accurate
   - Verify per-verse stats are accurate

6. **Edge Cases**
   - Empty state handling
   - Rapid consecutive actions
   - Very long verse text

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| expo-sqlite API changes | Use documented async API only |
| Performance with many verses | Add pagination if needed in Phase 5 |
| Data migration issues | Simple schema, no migrations needed for MVP |
| Zustand complexity | Keep store flat, avoid nested updates |
| Race conditions | Zustand handles this; use loading flags |

---

## Dependencies

### NPM Packages (Already Installed)
- `expo-sqlite` ^16.0.0
- `zustand` ^5.0.0

### May Need to Install
- `expo-crypto` - For UUID generation (verify if already available)

Check with:
```bash
cd memory-mate-mvp
npm list expo-crypto
```

If not installed:
```bash
npx expo install expo-crypto
```

---

## Notes for Implementation

### SQLite Best Practices
- Always use parameterized queries (prevent SQL injection)
- Use transactions for multi-step operations
- Handle errors at service layer, not in store
- Keep queries simple; optimize later if needed

### Zustand Best Practices
- Don't store derived state (use getters)
- Update state immutably
- Keep actions async-friendly
- Use loading/error flags consistently

### TypeScript Considerations
- SQLite returns numbers for booleans (convert in service layer)
- Dates stored as ISO strings (consistent with types)
- Use strict null checks

---

## Success Criteria

Phase 4 is complete when:

1. ✅ All data persists across app restarts
2. ✅ All CRUD operations work correctly
3. ✅ Statistics calculate accurately
4. ✅ Loading states provide feedback
5. ✅ Errors are handled gracefully
6. ✅ No mock data is used by the app
7. ✅ CP-4 verification checklist passes

---

## Next Steps After Phase 4

After completing Phase 4 and passing CP-4:

1. Archive `mockData.ts` (keep for reference)
2. Update `claude.md` with Phase 4 completion
3. Create `ccc.19.mvp-implementation-phase-4-completed-status.md`
4. Proceed to Phase 5: Feature Integration & Polish

---

**Document Version**: 1.0
**Created**: 2026-01-25
**Author**: Claude Code
**Phase Status**: 📋 Planning Complete - Ready for Implementation