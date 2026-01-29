import { getDatabase } from './database';
import { TestResult } from '@/types';
import { generateUUID } from '@/utils/uuid';
import * as progressService from './progressService';

/**
 * SQLite row type for test results (uses number for boolean)
 */
interface TestResultRow {
  id: string;
  verse_id: string;
  timestamp: string;
  passed: number; // 0 or 1
  score: number | null;
}

/**
 * Convert SQLite row to TestResult type
 */
function rowToTestResult(row: TestResultRow): TestResult {
  return {
    ...row,
    passed: row.passed === 1,
    score: row.score ?? undefined,
  };
}

/**
 * Record a test result and update progress
 */
export async function recordTestResult(
  verseId: string,
  passed: boolean,
  score?: number
): Promise<TestResult> {
  const db = getDatabase();
  const id = generateUUID();
  const timestamp = new Date().toISOString();

  // Start transaction
  await db.withTransactionAsync(async () => {
    // Insert test result
    await db.runAsync(
      'INSERT INTO test_results (id, verse_id, timestamp, passed, score) VALUES (?, ?, ?, ?, ?)',
      [id, verseId, timestamp, passed ? 1 : 0, score ?? null]
    );

    // Update progress
    await db.runAsync(
      `INSERT INTO progress (verse_id, times_tested, times_correct, last_tested)
       VALUES (?, 1, ?, ?)
       ON CONFLICT(verse_id) DO UPDATE SET
         times_tested = times_tested + 1,
         times_correct = times_correct + ?,
         last_tested = ?`,
      [verseId, passed ? 1 : 0, timestamp, passed ? 1 : 0, timestamp]
    );
  });

  return { id, verse_id: verseId, timestamp, passed, score: score ?? undefined };
}

/**
 * Get test history for a verse
 */
export async function getTestHistory(
  verseId: string,
  limit: number = 100
): Promise<TestResult[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<TestResultRow>(
    `SELECT * FROM test_results
     WHERE verse_id = ?
     ORDER BY timestamp DESC
     LIMIT ?`,
    [verseId, limit]
  );
  return rows.map(rowToTestResult);
}

/**
 * Get all test results (with optional limit)
 */
export async function getAllTestResults(limit: number = 1000): Promise<TestResult[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<TestResultRow>(
    'SELECT * FROM test_results ORDER BY timestamp DESC LIMIT ?',
    [limit]
  );
  return rows.map(rowToTestResult);
}
