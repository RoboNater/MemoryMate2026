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

  // Create tables (one statement per execAsync for sql.js compatibility)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS verses (
      id TEXT PRIMARY KEY,
      reference TEXT NOT NULL,
      text TEXT NOT NULL,
      translation TEXT NOT NULL DEFAULT 'NIV',
      created_at TEXT NOT NULL,
      archived INTEGER NOT NULL DEFAULT 0
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
      FOREIGN KEY (verse_id) REFERENCES verses(id) ON DELETE CASCADE
    );
  `);

  await db.execAsync(
    'CREATE INDEX IF NOT EXISTS idx_test_results_verse_id ON test_results(verse_id);'
  );

  await db.execAsync(
    'CREATE INDEX IF NOT EXISTS idx_test_results_timestamp ON test_results(timestamp);'
  );
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
