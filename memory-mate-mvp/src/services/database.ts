import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'memory_mate.db';
const DATABASE_VERSION = 1;

// Database instance (singleton)
let db: SQLite.SQLiteDatabase | null = null;

/**
 * Initialize database with schema
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  // Enable foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Create tables
  await db.execAsync(`
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

    -- Indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_test_results_verse_id ON test_results(verse_id);
    CREATE INDEX IF NOT EXISTS idx_test_results_timestamp ON test_results(timestamp);
  `);

  return db;
}

/**
 * Get database instance
 */
export function getDatabase(): SQLite.SQLiteDatabase {
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
