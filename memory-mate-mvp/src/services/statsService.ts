import { getDatabase } from './database';
import { OverallStats, VerseStats } from '@/types';

/**
 * Get overall statistics across all verses
 */
export async function getOverallStats(): Promise<OverallStats> {
  const db = getDatabase();

  // Get verse counts
  const verseCounts = await db.getFirstAsync<{
    total: number;
    active: number;
    archived: number;
  }>(
    `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN archived = 0 THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN archived = 1 THEN 1 ELSE 0 END) as archived
    FROM verses`
  );

  // Get practice/test totals
  const progressTotals = await db.getFirstAsync<{
    total_practiced: number;
    total_tested: number;
    total_correct: number;
  }>(
    `SELECT
      COALESCE(SUM(times_practiced), 0) as total_practiced,
      COALESCE(SUM(times_tested), 0) as total_tested,
      COALESCE(SUM(times_correct), 0) as total_correct
    FROM progress`
  );

  // Get comfort level distribution
  const comfortDist = await db.getAllAsync<{
    comfort_level: number;
    count: number;
  }>(
    `SELECT comfort_level, COUNT(*) as count
    FROM progress
    GROUP BY comfort_level`
  );

  // Build verses_by_comfort object
  const verses_by_comfort = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of comfortDist) {
    verses_by_comfort[row.comfort_level as 1 | 2 | 3 | 4 | 5] = row.count;
  }

  // Calculate accuracy
  const overall_accuracy =
    (progressTotals?.total_tested ?? 0) > 0
      ? (progressTotals?.total_correct ?? 0) / (progressTotals?.total_tested ?? 1)
      : 0;

  // Calculate average comfort
  const totalComfort = Object.entries(verses_by_comfort).reduce(
    (sum, [level, count]) => sum + Number(level) * count,
    0
  );
  const totalWithProgress = Object.values(verses_by_comfort).reduce((a, b) => a + b, 0);
  const average_comfort = totalWithProgress > 0 ? totalComfort / totalWithProgress : 0;

  return {
    total_verses: verseCounts?.total ?? 0,
    active_verses: verseCounts?.active ?? 0,
    archived_verses: verseCounts?.archived ?? 0,
    total_practiced: progressTotals?.total_practiced ?? 0,
    total_tested: progressTotals?.total_tested ?? 0,
    total_correct: progressTotals?.total_correct ?? 0,
    overall_accuracy,
    verses_by_comfort,
    average_comfort,
  };
}

/**
 * Get statistics for a specific verse
 */
export async function getVerseStats(verseId: string): Promise<VerseStats | null> {
  const db = getDatabase();

  // Get progress data
  const progress = await db.getFirstAsync<{
    times_practiced: number;
    times_tested: number;
    times_correct: number;
    comfort_level: number;
    last_practiced: string | null;
    last_tested: string | null;
  }>(
    `SELECT times_practiced, times_tested, times_correct, comfort_level, last_practiced, last_tested
    FROM progress
    WHERE verse_id = ?`,
    [verseId]
  );

  if (!progress) {
    return null;
  }

  // Calculate accuracy for this verse
  const accuracy = progress.times_tested > 0 ? progress.times_correct / progress.times_tested : 0;

  // Get consecutive correct tests
  const consecutiveCorrect = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count
    FROM test_results
    WHERE verse_id = ?
      AND id IN (
        SELECT id FROM test_results
        WHERE verse_id = ?
        ORDER BY timestamp DESC
        LIMIT (
          SELECT COUNT(*) FROM test_results
          WHERE verse_id = ? AND passed = 0
        )
      )
      AND passed = 1`,
    [verseId, verseId, verseId]
  );

  return {
    verse_id: verseId,
    times_practiced: progress.times_practiced,
    times_tested: progress.times_tested,
    times_correct: progress.times_correct,
    accuracy,
    comfort_level: progress.comfort_level as 1 | 2 | 3 | 4 | 5,
    last_practiced: progress.last_practiced,
    last_tested: progress.last_tested,
    consecutive_correct: consecutiveCorrect?.count ?? 0,
  };
}
