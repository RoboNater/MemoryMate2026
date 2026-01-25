import { getDatabase } from './database';
import { VerseProgress } from '@/types';

/**
 * SQLite row type for progress (uses number for boolean)
 */
interface ProgressRow {
  verse_id: string;
  times_practiced: number;
  times_tested: number;
  times_correct: number;
  last_practiced: string | null;
  last_tested: string | null;
  comfort_level: number;
}

/**
 * Convert SQLite row to VerseProgress type
 */
function rowToProgress(row: ProgressRow): VerseProgress {
  return row as VerseProgress;
}

/**
 * Get progress for a verse (returns empty progress if none exists)
 */
export async function getProgress(verseId: string): Promise<VerseProgress> {
  const db = getDatabase();
  const row = await db.getFirstAsync<ProgressRow>(
    'SELECT * FROM progress WHERE verse_id = ?',
    [verseId]
  );

  if (row) {
    return rowToProgress(row);
  }

  // Return default progress if none exists
  return {
    verse_id: verseId,
    times_practiced: 0,
    times_tested: 0,
    times_correct: 0,
    last_practiced: null,
    last_tested: null,
    comfort_level: 1,
  };
}

/**
 * Get all progress records
 */
export async function getAllProgress(): Promise<VerseProgress[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<ProgressRow>('SELECT * FROM progress');
  return rows.map(rowToProgress);
}

/**
 * Record a practice session
 */
export async function recordPractice(verseId: string): Promise<boolean> {
  const db = getDatabase();
  const now = new Date().toISOString();

  // Upsert pattern: insert if not exists, update if exists
  await db.runAsync(
    `INSERT INTO progress (verse_id, times_practiced, last_practiced, comfort_level)
     VALUES (?, 1, ?, 1)
     ON CONFLICT(verse_id) DO UPDATE SET
       times_practiced = times_practiced + 1,
       last_practiced = ?`,
    [verseId, now, now]
  );

  return true;
}

/**
 * Set comfort level (1-5)
 */
export async function setComfortLevel(
  verseId: string,
  level: 1 | 2 | 3 | 4 | 5
): Promise<boolean> {
  const db = getDatabase();

  // Upsert: create progress if doesn't exist, update comfort level
  await db.runAsync(
    `INSERT INTO progress (verse_id, comfort_level)
     VALUES (?, ?)
     ON CONFLICT(verse_id) DO UPDATE SET
       comfort_level = ?`,
    [verseId, level, level]
  );

  return true;
}

/**
 * Reset progress for a verse
 */
export async function resetProgress(verseId: string): Promise<boolean> {
  const db = getDatabase();

  // Delete progress and all associated test results
  await db.runAsync('DELETE FROM test_results WHERE verse_id = ?', [verseId]);
  await db.runAsync('DELETE FROM progress WHERE verse_id = ?', [verseId]);

  return true;
}
