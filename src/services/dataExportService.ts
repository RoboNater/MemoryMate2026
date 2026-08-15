import { getDatabase } from './database';
import { Verse, VerseProgress, TestResult, Shelf } from '@/types';
import * as verseService from './verseService';
import * as shelfService from './shelfService';
import * as progressService from './progressService';
import * as testService from './testService';
import {
  validateExportFormat,
  validateVerse,
  validateShelf,
  validateProgress,
  validateTestResult,
} from './importValidation';

/**
 * Export/Import service for JSON serialization of all app data.
 *
 * Export: Queries database and produces JSON string
 * Import: Parses JSON, validates, and replaces all data (transaction-safe)
 */

/**
 * Shape of the exported JSON file.
 *
 * Version history:
 *   1 - verses / progress / test_results
 *   2 - adds shelves and verses[].shelf_id (issue #5). Version-1 files still
 *       import fine: shelves defaults to [] and shelf_id to null.
 */
export interface ExportFile {
  version: number;
  exported_at: string;
  app: string;
  data: {
    verses: Verse[];
    shelves?: Shelf[];
    progress: VerseProgress[];
    test_results: TestResult[];
  };
}

/**
 * Result of an import operation
 */
export interface ImportResult {
  success: boolean;
  versesImported: number;
  shelvesImported?: number;
  progressImported: number;
  testResultsImported: number;
  error?: string;
  warnings?: string[];
}

/**
 * Export all data as a formatted JSON string
 */
export async function exportAllDataAsJSON(): Promise<string> {
  try {
    // Query all data from database
    const verses = await verseService.getAllVerses(true); // Include archived
    const shelves = await shelfService.getAllShelves();
    const allProgress = await progressService.getAllProgress();
    const allTestResults = await testService.getAllTestResults();

    // Build export object
    const exportFile: ExportFile = {
      version: 2,
      exported_at: new Date().toISOString(),
      app: 'MemoryMate',
      data: {
        verses: verses.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
        shelves,
        progress: allProgress,
        test_results: allTestResults.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
      },
    };

    // Serialize to formatted JSON
    return JSON.stringify(exportFile, null, 2);
  } catch (error) {
    throw new Error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Import data from a JSON string, replacing all existing data
 */
export async function importAllDataFromJSON(json: string): Promise<ImportResult> {
  try {
    // Parse JSON
    let exportFile: ExportFile;
    try {
      exportFile = JSON.parse(json);
    } catch {
      return {
        success: false,
        versesImported: 0,
        progressImported: 0,
        testResultsImported: 0,
        error: 'Invalid JSON format. Please select a valid MemoryMate export file.',
      };
    }

    // Validate structure
    const validation = validateExportFormat(exportFile);
    if (!validation.valid) {
      return {
        success: false,
        versesImported: 0,
        progressImported: 0,
        testResultsImported: 0,
        error: validation.errors[0] || 'Invalid export file format',
      };
    }

    const { verses: versesData, progress: progressData, test_results: testResultsData } = exportFile.data;
    // Absent in version-1 files.
    const shelvesData = exportFile.data.shelves ?? [];

    // Track warnings for skipped records
    const warnings: string[] = [];

    // Filter shelves: collect valid ones, warn about invalid ones
    const validShelves: Shelf[] = [];
    const shelfIds = new Set<string>();
    for (const shelf of shelvesData) {
      const error = validateShelf(shelf);
      if (error) {
        warnings.push(`Skipped shelf ${shelf?.id ?? '(no id)'}: ${error}`);
        continue;
      }
      if (shelfIds.has(shelf.id)) {
        warnings.push(`Skipped duplicate shelf ID: ${shelf.id}`);
        continue;
      }
      validShelves.push(shelf);
      shelfIds.add(shelf.id);
    }

    // Validate verses (strict - must have at least one valid verse)
    const verseIds = new Set<string>();
    for (const verse of versesData) {
      const error = validateVerse(verse);
      if (error) {
        return {
          success: false,
          versesImported: 0,
          progressImported: 0,
          testResultsImported: 0,
          error: `Invalid verse data: ${error}`,
        };
      }
      if (verseIds.has(verse.id)) {
        return {
          success: false,
          versesImported: 0,
          progressImported: 0,
          testResultsImported: 0,
          error: `Duplicate verse ID: ${verse.id}`,
        };
      }
      verseIds.add(verse.id);
    }

    // Check that we have at least one valid verse
    if (versesData.length === 0) {
      return {
        success: false,
        versesImported: 0,
        progressImported: 0,
        testResultsImported: 0,
        error: 'No valid verses found in import file. Cannot import empty dataset.',
      };
    }

    // Filter progress records: collect valid ones, warn about invalid ones
    const validProgress: VerseProgress[] = [];
    for (const progress of progressData) {
      const error = validateProgress(progress, verseIds);
      if (error) {
        warnings.push(`Skipped progress record for verse_id ${progress.verse_id}: ${error}`);
      } else {
        validProgress.push(progress);
      }
    }

    // Filter test results: collect valid ones, warn about invalid ones
    const validTestResults: TestResult[] = [];
    const testIds = new Set<string>();
    for (const result of testResultsData) {
      const error = validateTestResult(result, verseIds);
      if (error) {
        warnings.push(`Skipped test result ${result.id}: ${error}`);
        continue;
      }

      // Check for duplicate test IDs among VALID results
      if (testIds.has(result.id)) {
        warnings.push(`Skipped duplicate test result ID: ${result.id}`);
        continue;
      }

      validTestResults.push(result);
      testIds.add(result.id);
    }

    // Perform the import as a SYNC-AWARE full replacement (issue #5 review,
    // concern 3). On a device that has already synced, the old hard-delete +
    // reinsert-with-historical-timestamps was unsafe: imported rows landed BELOW
    // the push watermark (so they never uploaded), and rows the backup dropped
    // left no tombstone (so they lingered in the cloud and could reappear).
    // Instead we (1) stamp every imported row's updated_at at import time so it
    // uploads and wins last-write-wins, (2) tombstone local rows the backup
    // omits so their removal propagates, and (3) reset the sync watermarks so
    // the next sync fully re-pushes the imported state and re-pulls the cloud.
    const db = getDatabase();

    // Backup key sets — used both to reinsert and to tombstone the difference.
    const backupShelfIds = new Set(validShelves.map((s) => s.id));
    const backupVerseIds = new Set(versesData.map((v) => v.id));
    const backupProgressIds = new Set(validProgress.map((p) => p.verse_id));
    const backupTestIds = new Set(validTestResults.map((t) => t.id));

    // Chunk id lists so `IN (...)` never exceeds SQLite's variable limit.
    const chunkArray = <T>(arr: T[], size: number): T[][] => {
      const out: T[][] = [];
      for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
      return out;
    };

    try {
      const importedAt = new Date().toISOString();
      await db.withTransactionAsync(async () => {
        // (2) Tombstone live local rows the backup omits, so the deletion syncs.
        const tombstoneAbsent = async (
          table: string,
          keyCol: string,
          keep: Set<string>
        ) => {
          const existing = await db.getAllAsync<{ k: string }>(
            `SELECT ${keyCol} AS k FROM ${table} WHERE deleted_at IS NULL`
          );
          const toRemove = existing.map((r) => r.k).filter((k) => !keep.has(k));
          for (const part of chunkArray(toRemove, 400)) {
            const placeholders = part.map(() => '?').join(',');
            await db.runAsync(
              `UPDATE ${table} SET deleted_at = ?, updated_at = ? WHERE ${keyCol} IN (${placeholders})`,
              [importedAt, importedAt, ...part]
            );
          }
        };
        await tombstoneAbsent('test_results', 'id', backupTestIds);
        await tombstoneAbsent('progress', 'verse_id', backupProgressIds);
        await tombstoneAbsent('verses', 'id', backupVerseIds);
        await tombstoneAbsent('shelves', 'id', backupShelfIds);

        // (1) Write backup rows, each stamped at import time. These are UPSERTs,
        // NOT delete-then-insert: hard-deleting a retained parent verse would
        // cascade (progress/test_results use ON DELETE CASCADE with FKs on) and
        // wipe the tombstones we just created for that verse's omitted children
        // before they ever sync (issue #5 follow-up review). Upserting the parent
        // in place leaves those child tombstones intact. deleted_at is forced to
        // NULL so a row that was tombstoned locally but is present in the backup
        // is resurrected. Shelves first so verse shelf assignments resolve.
        for (const shelf of validShelves) {
          await db.runAsync(
            `INSERT INTO shelves (id, name, created_at, updated_at, deleted_at)
             VALUES (?, ?, ?, ?, NULL)
             ON CONFLICT(id) DO UPDATE SET
               name = excluded.name, created_at = excluded.created_at,
               updated_at = excluded.updated_at, deleted_at = NULL`,
            [shelf.id, shelf.name, shelf.created_at, importedAt]
          );
        }

        for (const verse of versesData) {
          // Drop shelf assignments that point at a shelf not in this file.
          const shelfId =
            verse.shelf_id && shelfIds.has(verse.shelf_id) ? verse.shelf_id : null;
          if (verse.shelf_id && !shelfId) {
            warnings.push(
              `Verse ${verse.id}: shelf ${verse.shelf_id} not found in file; imported unshelved`
            );
          }
          await db.runAsync(
            `INSERT INTO verses (id, reference, text, translation, created_at, archived, shelf_id, updated_at, deleted_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
             ON CONFLICT(id) DO UPDATE SET
               reference = excluded.reference, text = excluded.text,
               translation = excluded.translation, created_at = excluded.created_at,
               archived = excluded.archived, shelf_id = excluded.shelf_id,
               updated_at = excluded.updated_at, deleted_at = NULL`,
            [verse.id, verse.reference, verse.text, verse.translation, verse.created_at, verse.archived ? 1 : 0, shelfId, importedAt]
          );
        }

        for (const progress of validProgress) {
          await db.runAsync(
            `INSERT INTO progress (verse_id, times_practiced, times_tested, times_correct, last_practiced, last_tested, comfort_level, updated_at, deleted_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
             ON CONFLICT(verse_id) DO UPDATE SET
               times_practiced = excluded.times_practiced, times_tested = excluded.times_tested,
               times_correct = excluded.times_correct, last_practiced = excluded.last_practiced,
               last_tested = excluded.last_tested, comfort_level = excluded.comfort_level,
               updated_at = excluded.updated_at, deleted_at = NULL`,
            [
              progress.verse_id,
              progress.times_practiced,
              progress.times_tested,
              progress.times_correct,
              progress.last_practiced,
              progress.last_tested,
              progress.comfort_level,
              importedAt,
            ]
          );
        }

        for (const result of validTestResults) {
          await db.runAsync(
            `INSERT INTO test_results (id, verse_id, timestamp, passed, score, updated_at, deleted_at)
             VALUES (?, ?, ?, ?, ?, ?, NULL)
             ON CONFLICT(id) DO UPDATE SET
               verse_id = excluded.verse_id, timestamp = excluded.timestamp,
               passed = excluded.passed, score = excluded.score,
               updated_at = excluded.updated_at, deleted_at = NULL`,
            [result.id, result.verse_id, result.timestamp, result.passed ? 1 : 0, result.score ?? null, importedAt]
          );
        }

        // (3) Reset sync watermarks so the next sync re-pushes the imported state
        // (including the tombstones) and re-pulls/merges the cloud. synced_user_id
        // is kept so this doesn't re-trigger the cross-account purge path.
        await db.runAsync(
          `DELETE FROM sync_state
             WHERE key IN ('last_pushed_at', 'last_pulled_at')
                OR key LIKE 'last_pulled_at:%'`
        );
      });
    } catch (error) {
      throw new Error(
        `Database error during import: ${error instanceof Error ? error.message : 'Unknown error'}. Your existing data has not been changed.`
      );
    }

    return {
      success: true,
      versesImported: versesData.length,
      shelvesImported: validShelves.length,
      progressImported: validProgress.length,
      testResultsImported: validTestResults.length,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    return {
      success: false,
      versesImported: 0,
      progressImported: 0,
      testResultsImported: 0,
      error: error instanceof Error ? error.message : 'Import failed',
    };
  }
}
