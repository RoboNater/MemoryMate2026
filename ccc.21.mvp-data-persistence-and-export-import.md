# Plan: MVP Phase 4 Addendum — sql.js + IndexedDB Persistence & JSON Export/Import

**Date**: 2026-01-26
**Status**: Part 1 Complete — Part 2 Ready for Implementation

## Goal
Add two capabilities to the MemoryMate MVP web platform (Phase 4 Addendum):
1. **Persistence**: Data survives page reloads via IndexedDB-backed storage of the sql.js database blob
2. **Portability**: Export/import all data as a shareable JSON file

**Note**: This addendum extends Phase 4 (Data Layer Integration). Phase 5 will be Feature Integration & Polish.

---

## Part 1: IndexedDB Persistence (Web)

### How it works
- sql.js can export its entire database as a `Uint8Array` binary blob
- sql.js can also be initialized FROM a `Uint8Array` (restoring a previous database)
- We store that blob in IndexedDB under a single key
- On startup: load blob from IndexedDB → pass to sql.js → full database restored
- After mutations: export blob from sql.js → save to IndexedDB (debounced)

### Files to create

**`src/services/webPersistence.ts`** — IndexedDB read/write for the database blob
- Uses raw IndexedDB API (no new dependencies)
- `loadDatabaseBlob(): Promise<Uint8Array | null>`
- `saveDatabaseBlob(data: Uint8Array): Promise<void>`
- Single IndexedDB database (`MemoryMateDB`) with one object store (`databases`) and one key (`main`)

### Files to modify

**`src/services/webDatabase.ts`** — Add persistence hooks to the sql.js adapter
- `openWebDatabase()` accepts an optional `Uint8Array` to restore from saved state
- Add `exportDatabase(): Uint8Array` to the returned adapter object
- After every write call (`runAsync`, `execAsync`), schedule a debounced save (e.g. 500ms) that calls `exportDatabase()` → `saveDatabaseBlob()`
- The debounce prevents rapid successive writes from hammering IndexedDB

**`src/services/database.ts`** — Wire up the persistence on web startup
- Extend `AppDatabase` interface with optional `exportDatabase?(): Uint8Array`
- On web init: call `loadDatabaseBlob()` first, pass result to `openWebDatabase(blob)`
- Update console log to indicate persistent mode
- No changes to native path

**`src/types/sql-js.d.ts`** — Add `Database` constructor overload that accepts `Uint8Array`

### No changes needed to
- Service layer (`verseService.ts`, `progressService.ts`, `testService.ts`, `statsService.ts`)
- Store (`verseStore.ts`) — persistence is transparent, handled inside the adapter
- Screens — no UI changes for this part

---

## Part 2: JSON Export/Import

### JSON format
Portable, human-readable, mirrors the data model:
```json
{
  "version": 1,
  "exported_at": "2026-01-26T12:00:00.000Z",
  "app": "MemoryMate",
  "data": {
    "verses": [ { "id": "...", "reference": "...", "text": "...", "translation": "...", "created_at": "...", "archived": false } ],
    "progress": [ { "verse_id": "...", "times_practiced": 0, "times_tested": 0, "times_correct": 0, "last_practiced": null, "last_tested": null, "comfort_level": 1 } ],
    "test_results": [ { "id": "...", "verse_id": "...", "timestamp": "...", "passed": true, "score": 0.95 } ]
  }
}
```

### Files to create

**`src/services/dataExportService.ts`** — Export/import logic
- `exportAllDataAsJSON(): Promise<string>` — queries all 3 tables, builds JSON string
- `importAllDataFromJSON(json: string): Promise<void>` — parses JSON, validates structure, clears existing data, inserts all records in a transaction, triggers IndexedDB save on web

### Files to modify

**`src/store/verseStore.ts`** — Add store actions
- `exportData(): Promise<string>` — calls `exportAllDataAsJSON()`
- `importData(json: string): Promise<void>` — calls `importAllDataFromJSON()`, then refreshes all state

**`src/app/(tabs)/settings.tsx`** — Add Export/Import UI
- "Export Data" button → generates JSON → triggers browser download (web) or share sheet (native)
- "Import Data" button → file picker → reads JSON → imports → refreshes UI
- Confirmation prompt before import (replaces existing data)
- Success/error feedback

---

## Dependency changes
- **None** — raw IndexedDB API is built into all browsers, no new packages needed

## Native platform impact
- **None** — all IndexedDB code is behind `Platform.OS === 'web'` checks
- Native continues using expo-sqlite with built-in file persistence
- JSON export/import works on both platforms (queries the database the same way)

## Verification
1. Add verses, practice, test on web → reload page → data should still be there
2. Export JSON → inspect file contents → should contain all data
3. Clear browser data → import the JSON file → all data restored
4. Verify native platform still works unchanged (no regressions)
