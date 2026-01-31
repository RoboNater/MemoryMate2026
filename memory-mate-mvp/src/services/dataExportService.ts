import { getDatabase } from './database';
import { Verse, VerseProgress, TestResult } from '@/types';
import * as verseService from './verseService';
import * as progressService from './progressService';
import * as testService from './testService';

/**
 * Export/Import service for JSON serialization of all app data.
 *
 * Export: Queries database and produces JSON string
 * Import: Parses JSON, validates, and replaces all data (transaction-safe)
 */

/**
 * Shape of the exported JSON file
 */
export interface ExportFile {
  version: number;
  exported_at: string;
  app: string;
  data: {
    verses: Verse[];
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
  progressImported: number;
  testResultsImported: number;
  error?: string;
  warnings?: string[];
}

/**
 * Validation result
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Export all data as a formatted JSON string
 */
export async function exportAllDataAsJSON(): Promise<string> {
  try {
    // Query all data from database
    const verses = await verseService.getAllVerses(true); // Include archived
    const allProgress = await progressService.getAllProgress();
    const allTestResults = await testService.getAllTestResults();

    // Build export object
    const exportFile: ExportFile = {
      version: 1,
      exported_at: new Date().toISOString(),
      app: 'MemoryMate',
      data: {
        verses: verses.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
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
    } catch (error) {
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

    // Track warnings for skipped records
    const warnings: string[] = [];

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

    // Perform transaction: delete all, then insert new data
    const db = getDatabase();

    try {
      await db.withTransactionAsync(async () => {
        // Delete in reverse dependency order
        await db.runAsync('DELETE FROM test_results');
        await db.runAsync('DELETE FROM progress');
        await db.runAsync('DELETE FROM verses');

        // Insert new data
        for (const verse of versesData) {
          await db.runAsync(
            'INSERT INTO verses (id, reference, text, translation, created_at, archived) VALUES (?, ?, ?, ?, ?, ?)',
            [verse.id, verse.reference, verse.text, verse.translation, verse.created_at, verse.archived ? 1 : 0]
          );
        }

        // Insert only VALID progress records
        for (const progress of validProgress) {
          await db.runAsync(
            'INSERT INTO progress (verse_id, times_practiced, times_tested, times_correct, last_practiced, last_tested, comfort_level) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
              progress.verse_id,
              progress.times_practiced,
              progress.times_tested,
              progress.times_correct,
              progress.last_practiced,
              progress.last_tested,
              progress.comfort_level,
            ]
          );
        }

        // Insert only VALID test results
        for (const result of validTestResults) {
          await db.runAsync(
            'INSERT INTO test_results (id, verse_id, timestamp, passed, score) VALUES (?, ?, ?, ?, ?)',
            [result.id, result.verse_id, result.timestamp, result.passed ? 1 : 0, result.score ?? null]
          );
        }
      });
    } catch (error) {
      throw new Error(
        `Database error during import: ${error instanceof Error ? error.message : 'Unknown error'}. Your existing data has not been changed.`
      );
    }

    return {
      success: true,
      versesImported: versesData.length,
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

/**
 * Validate export file structure
 */
function validateExportFormat(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('Invalid file: not an object');
    return { valid: false, errors };
  }

  if (data.version !== 1) {
    errors.push(`Unsupported export version: ${data.version}. Expected version 1.`);
  }

  if (data.app !== 'MemoryMate') {
    errors.push(`Invalid file. Expected app "MemoryMate", got "${data.app}".`);
  }

  if (!data.exported_at || typeof data.exported_at !== 'string') {
    errors.push('Missing or invalid exported_at field');
  }

  if (!data.data || typeof data.data !== 'object') {
    errors.push('Missing or invalid data field');
    return { valid: false, errors };
  }

  if (!Array.isArray(data.data.verses)) {
    errors.push('Missing or invalid verses array');
  }

  if (!Array.isArray(data.data.progress)) {
    errors.push('Missing or invalid progress array');
  }

  if (!Array.isArray(data.data.test_results)) {
    errors.push('Missing or invalid test_results array');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a single verse
 */
function validateVerse(verse: any): string | null {
  if (!verse || typeof verse !== 'object') {
    return 'Verse is not an object';
  }

  if (!verse.id || typeof verse.id !== 'string') {
    return 'Missing or invalid id field';
  }

  if (!isValidUUID(verse.id)) {
    return `Invalid UUID format: ${verse.id}`;
  }

  if (!verse.reference || typeof verse.reference !== 'string') {
    return 'Missing or invalid reference field';
  }

  if (!verse.text || typeof verse.text !== 'string') {
    return 'Missing or invalid text field';
  }

  if (!verse.translation || typeof verse.translation !== 'string') {
    return 'Missing or invalid translation field';
  }

  if (!verse.created_at || !isValidISO8601(verse.created_at)) {
    return `Invalid created_at datetime: ${verse.created_at}`;
  }

  if (typeof verse.archived !== 'boolean') {
    return 'Missing or invalid archived field (must be boolean)';
  }

  return null;
}

/**
 * Validate a single progress record
 */
function validateProgress(progress: any, verseIds: Set<string>): string | null {
  if (!progress || typeof progress !== 'object') {
    return 'Progress is not an object';
  }

  if (!progress.verse_id || typeof progress.verse_id !== 'string') {
    return 'Missing or invalid verse_id field';
  }

  if (!verseIds.has(progress.verse_id)) {
    return `verse_id references non-existent verse: ${progress.verse_id}`;
  }

  if (!isValidUUID(progress.verse_id)) {
    return `Invalid UUID format for verse_id: ${progress.verse_id}`;
  }

  if (typeof progress.times_practiced !== 'number' || progress.times_practiced < 0) {
    return `Invalid times_practiced: ${progress.times_practiced} (must be non-negative integer)`;
  }

  if (typeof progress.times_tested !== 'number' || progress.times_tested < 0) {
    return `Invalid times_tested: ${progress.times_tested} (must be non-negative integer)`;
  }

  if (typeof progress.times_correct !== 'number' || progress.times_correct < 0) {
    return `Invalid times_correct: ${progress.times_correct} (must be non-negative integer)`;
  }

  if (progress.times_correct > progress.times_tested) {
    return `times_correct (${progress.times_correct}) cannot exceed times_tested (${progress.times_tested})`;
  }

  if (progress.last_practiced !== null && !isValidISO8601(progress.last_practiced)) {
    return `Invalid last_practiced datetime: ${progress.last_practiced}`;
  }

  if (progress.last_tested !== null && !isValidISO8601(progress.last_tested)) {
    return `Invalid last_tested datetime: ${progress.last_tested}`;
  }

  const comfortLevel = progress.comfort_level;
  if (typeof comfortLevel !== 'number' || comfortLevel < 1 || comfortLevel > 5 || !Number.isInteger(comfortLevel)) {
    return `Invalid comfort_level: ${comfortLevel} (must be 1-5)`;
  }

  return null;
}

/**
 * Validate a single test result
 */
function validateTestResult(result: any, verseIds: Set<string>): string | null {
  if (!result || typeof result !== 'object') {
    return 'Test result is not an object';
  }

  if (!result.id || typeof result.id !== 'string') {
    return 'Missing or invalid id field';
  }

  if (!isValidUUID(result.id)) {
    return `Invalid UUID format: ${result.id}`;
  }

  if (!result.verse_id || typeof result.verse_id !== 'string') {
    return 'Missing or invalid verse_id field';
  }

  if (!verseIds.has(result.verse_id)) {
    return `verse_id references non-existent verse: ${result.verse_id}`;
  }

  if (!isValidUUID(result.verse_id)) {
    return `Invalid UUID format for verse_id: ${result.verse_id}`;
  }

  if (!result.timestamp || !isValidISO8601(result.timestamp)) {
    return `Invalid timestamp datetime: ${result.timestamp}`;
  }

  if (typeof result.passed !== 'boolean') {
    return 'Missing or invalid passed field (must be boolean)';
  }

  if (result.score !== undefined && result.score !== null) {
    if (typeof result.score !== 'number' || result.score < 0 || result.score > 1) {
      return `Invalid score: ${result.score} (must be 0.0-1.0 or null)`;
    }
  }

  return null;
}

/**
 * Validate UUID format (basic check)
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate ISO 8601 datetime format
 */
function isValidISO8601(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString === date.toISOString();
}
