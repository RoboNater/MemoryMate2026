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
 * Convert SQLite row to VerseProgress type.
 * Maps fields explicitly so internal sync columns never leak into the domain object.
 */
function rowToProgress(row: ProgressRow): VerseProgress {
  return {
    verse_id: row.verse_id,
    times_practiced: row.times_practiced,
    times_tested: row.times_tested,
    times_correct: row.times_correct,
    last_practiced: row.last_practiced,
    last_tested: row.last_tested,
    comfort_level: row.comfort_level as 1 | 2 | 3 | 4 | 5,
  };
}

/**
 * Get progress for a verse (returns empty progress if none exists)
 */
export async function getProgress(verseId: string): Promise<VerseProgress> {
  const db = getDatabase();
  const row = await db.getFirstAsync<ProgressRow>(
    'SELECT * FROM progress WHERE verse_id = ? AND deleted_at IS NULL',
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
  const rows = await db.getAllAsync<ProgressRow>(
    'SELECT * FROM progress WHERE deleted_at IS NULL'
  );
  return rows.map(rowToProgress);
}

/**
 * Record a practice session
 */
export async function recordPractice(verseId: string): Promise<boolean> {
  const db = getDatabase();
  const now = new Date().toISOString();

  // Upsert pattern: insert if not exists, update if exists.
  // deleted_at is cleared on conflict so practicing revives a tombstoned row.
  await db.runAsync(
    `INSERT INTO progress (verse_id, times_practiced, last_practiced, comfort_level, updated_at)
     VALUES (?, 1, ?, 1, ?)
     ON CONFLICT(verse_id) DO UPDATE SET
       times_practiced = times_practiced + 1,
       last_practiced = ?,
       updated_at = ?,
       deleted_at = NULL`,
    [verseId, now, now, now, now]
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
  const now = new Date().toISOString();

  // Upsert: create progress if doesn't exist, update comfort level.
  // deleted_at is cleared on conflict so setting comfort revives a tombstoned row.
  await db.runAsync(
    `INSERT INTO progress (verse_id, comfort_level, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(verse_id) DO UPDATE SET
       comfort_level = ?,
       updated_at = ?,
       deleted_at = NULL`,
    [verseId, level, now, level, now]
  );

  return true;
}

/**
 * Reset progress for a verse
 */
export async function resetProgress(verseId: string): Promise<boolean> {
  const db = getDatabase();
  const now = new Date().toISOString();

  // Soft-delete the test history (tombstones propagate on sync), and reset the
  // progress row in place to its zero state rather than deleting it. Resetting in
  // place (instead of tombstoning) avoids a future practice reviving the row and
  // adding to stale counts via the ON CONFLICT upsert.
  await db.runAsync(
    'UPDATE test_results SET deleted_at = ?, updated_at = ? WHERE verse_id = ? AND deleted_at IS NULL',
    [now, now, verseId]
  );
  await db.runAsync(
    `UPDATE progress SET
       times_practiced = 0,
       times_tested = 0,
       times_correct = 0,
       last_practiced = NULL,
       last_tested = NULL,
       comfort_level = 1,
       updated_at = ?,
       deleted_at = NULL
     WHERE verse_id = ?`,
    [now, verseId]
  );

  return true;
}
