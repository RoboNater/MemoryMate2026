import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

const DATABASE_NAME = 'memory_mate.db';

/**
 * Minimal database interface shared by expo-sqlite (native) and sql.js (web).
 * Services program against this interface so they work on all platforms.
 */
export interface AppDatabase {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params?: any[]): Promise<any>;
  getFirstAsync<T>(source: string, params?: any[]): Promise<T | null>;
  getAllAsync<T>(source: string, params?: any[]): Promise<T[]>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
  closeAsync(): Promise<void>;
  exportDatabase?(): Uint8Array; // Optional: used by web adapter for IndexedDB persistence
}

// Database singleton
let db: AppDatabase | null = null;

/**
 * Initialize database with schema.
 *
 * On native platforms this uses expo-sqlite (persistent).
 * On web this uses sql.js with IndexedDB persistence — SQLite compiled to WASM
 * that works in every modern browser. Web data persists via IndexedDB.
 */
export async function initDatabase(): Promise<void> {
  if (db) return;

  if (Platform.OS === 'web') {
    const { openWebDatabase } = await import('./webDatabase');
    const { loadDatabaseBlob } = await import('./webPersistence');

    // Try to restore saved database blob from IndexedDB
    const savedBlob = await loadDatabaseBlob();

    db = await openWebDatabase(savedBlob || undefined);

    if (savedBlob) {
      console.info(
        '[MemoryMate] Restored database from IndexedDB (web). Data persists between page reloads.'
      );
    } else {
      console.info(
        '[MemoryMate] Using new sql.js database with IndexedDB persistence (web). Data will persist between page reloads.'
      );
    }
  } else {
    db = await SQLite.openDatabaseAsync(DATABASE_NAME) as unknown as AppDatabase;
  }

  // CRITICAL: Enable foreign keys for this connection.
  // In SQLite, PRAGMA foreign_keys is per-connection and does NOT persist in the
  // database file. It must be set every time a connection is opened. This is why
  // we also set it in webDatabase.ts after database restoration from blob.
  // Reference: https://www.sqlite.org/pragma.html#pragma_foreign_keys
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Create tables (one statement per execAsync for sql.js compatibility).
  //
  // Sync columns (user_id / updated_at / deleted_at) are part of the fresh-install
  // schema here AND are added to pre-existing databases by runMigrations() below.
  // See ccc.30 (cross-device sync plan):
  //   - user_id    : owning Supabase auth user (NULL until sign-in, Phase 3)
  //   - updated_at : last-write-wins change marker (drives sync push/merge)
  //   - deleted_at : soft-delete tombstone so deletions propagate across devices
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS verses (
      id TEXT PRIMARY KEY,
      reference TEXT NOT NULL,
      text TEXT NOT NULL,
      translation TEXT NOT NULL DEFAULT 'NIV',
      created_at TEXT NOT NULL,
      archived INTEGER NOT NULL DEFAULT 0,
      user_id TEXT,
      updated_at TEXT,
      deleted_at TEXT
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS progress (
      verse_id TEXT PRIMARY KEY,
      times_practiced INTEGER NOT NULL DEFAULT 0,
      times_tested INTEGER NOT NULL DEFAULT 0,
      times_correct INTEGER NOT NULL DEFAULT 0,
      last_practiced TEXT,
      last_tested TEXT,
      comfort_level INTEGER NOT NULL DEFAULT 1,
      user_id TEXT,
      updated_at TEXT,
      deleted_at TEXT,
      FOREIGN KEY (verse_id) REFERENCES verses(id) ON DELETE CASCADE
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS test_results (
      id TEXT PRIMARY KEY,
      verse_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      passed INTEGER NOT NULL,
      score REAL,
      user_id TEXT,
      updated_at TEXT,
      deleted_at TEXT,
      FOREIGN KEY (verse_id) REFERENCES verses(id) ON DELETE CASCADE
    );
  `);

  await db.execAsync(
    'CREATE INDEX IF NOT EXISTS idx_test_results_verse_id ON test_results(verse_id);'
  );

  await db.execAsync(
    'CREATE INDEX IF NOT EXISTS idx_test_results_timestamp ON test_results(timestamp);'
  );

  // Bring pre-existing databases up to the current schema (additive, idempotent).
  await runMigrations(db);
}

/**
 * Return true if `column` exists on `table`.
 * Uses PRAGMA table_info, which works on both expo-sqlite and the sql.js web adapter.
 */
async function columnExists(
  db: AppDatabase,
  table: string,
  column: string
): Promise<boolean> {
  // Table name is a controlled constant (never user input), so interpolation is safe.
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return cols.some((c) => c.name === column);
}

/**
 * Add a column to a table only if it is missing. SQLite has no
 * "ADD COLUMN IF NOT EXISTS", so we check PRAGMA table_info first.
 */
async function addColumnIfMissing(
  db: AppDatabase,
  table: string,
  column: string,
  declaration: string
): Promise<void> {
  if (!(await columnExists(db, table, column))) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${declaration};`);
  }
}

/**
 * Idempotent schema migrations.
 *
 * Phase 1 of the cross-device sync work (ccc.30): add the sync metadata columns
 * to databases created before this schema existed, backfill `updated_at` for
 * existing rows, and create the sync_state checkpoint table. Safe to run on
 * every startup — each step is a no-op once applied.
 */
async function runMigrations(db: AppDatabase): Promise<void> {
  // 1. Add sync metadata columns to the three synced tables (no-op on fresh DBs).
  for (const table of ['verses', 'progress', 'test_results']) {
    await addColumnIfMissing(db, table, 'user_id', 'TEXT');
    await addColumnIfMissing(db, table, 'updated_at', 'TEXT');
    await addColumnIfMissing(db, table, 'deleted_at', 'TEXT');
  }

  // 2. Backfill updated_at for rows that predate change-tracking, so sync has a
  //    baseline timestamp. Uses each row's own most relevant existing timestamp.
  const now = new Date().toISOString();
  await db.runAsync('UPDATE verses SET updated_at = created_at WHERE updated_at IS NULL');
  await db.runAsync('UPDATE test_results SET updated_at = timestamp WHERE updated_at IS NULL');
  await db.runAsync(
    'UPDATE progress SET updated_at = COALESCE(last_tested, last_practiced, ?) WHERE updated_at IS NULL',
    [now]
  );

  // 3. Key/value table holding per-device sync checkpoints (e.g. last_pulled_at).
  //    Created now; populated by the sync engine in a later phase.
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_state (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

/**
 * Get database instance.
 */
export function getDatabase(): AppDatabase {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

/**
 * Close database (for cleanup)
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}
