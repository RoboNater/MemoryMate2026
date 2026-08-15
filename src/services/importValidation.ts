/**
 * Validation logic for MemoryMate export/import files. Split out of
 * dataExportService.ts (which imports the database layer) so these pure
 * functions can be unit-tested without pulling in the database.
 */

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate export file structure
 */
export function validateExportFormat(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('Invalid file: not an object');
    return { valid: false, errors };
  }

  if (data.version !== 1 && data.version !== 2) {
    errors.push(`Unsupported export version: ${data.version}. Expected version 1 or 2.`);
  }

  if (data.app !== 'MemoryMate') {
    errors.push(`Invalid file. Expected app "MemoryMate", got "${data.app}".`);
  }

  // exported_at is specified as ISO 8601 in docs/notes/data-format.md, and that
  // doc defines "ISO 8601" for this format as round-tripping exactly through
  // Date.toISOString() — the same check every other datetime field uses.
  if (!data.exported_at || typeof data.exported_at !== 'string') {
    errors.push('Missing or invalid exported_at field');
  } else if (!isValidISO8601(data.exported_at)) {
    errors.push(`Invalid exported_at datetime: ${data.exported_at}`);
  }

  if (!data.data || typeof data.data !== 'object') {
    errors.push('Missing or invalid data field');
    return { valid: false, errors };
  }

  if (!Array.isArray(data.data.verses)) {
    errors.push('Missing or invalid verses array');
  }

  // shelves arrived in version 2; when present it must be an array
  if (data.data.shelves !== undefined && !Array.isArray(data.data.shelves)) {
    errors.push('Invalid shelves field (must be an array when present)');
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
export function validateVerse(verse: any): string | null {
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

  // shelf_id is optional (absent in version-1 files); when set it must be a UUID
  if (verse.shelf_id !== undefined && verse.shelf_id !== null) {
    if (typeof verse.shelf_id !== 'string' || !isValidUUID(verse.shelf_id)) {
      return `Invalid shelf_id: ${verse.shelf_id}`;
    }
  }

  return null;
}

/**
 * Validate a single shelf
 */
export function validateShelf(shelf: any): string | null {
  if (!shelf || typeof shelf !== 'object') {
    return 'Shelf is not an object';
  }

  if (!shelf.id || typeof shelf.id !== 'string') {
    return 'Missing or invalid id field';
  }

  if (!isValidUUID(shelf.id)) {
    return `Invalid UUID format: ${shelf.id}`;
  }

  if (!shelf.name || typeof shelf.name !== 'string' || !shelf.name.trim()) {
    return 'Missing or invalid name field';
  }

  if (!shelf.created_at || !isValidISO8601(shelf.created_at)) {
    return `Invalid created_at datetime: ${shelf.created_at}`;
  }

  return null;
}

/**
 * Validate a single progress record
 */
export function validateProgress(progress: any, verseIds: Set<string>): string | null {
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

  if (!Number.isInteger(progress.times_practiced) || progress.times_practiced < 0) {
    return `Invalid times_practiced: ${progress.times_practiced} (must be non-negative integer)`;
  }

  if (!Number.isInteger(progress.times_tested) || progress.times_tested < 0) {
    return `Invalid times_tested: ${progress.times_tested} (must be non-negative integer)`;
  }

  if (!Number.isInteger(progress.times_correct) || progress.times_correct < 0) {
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
export function validateTestResult(result: any, verseIds: Set<string>): string | null {
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
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate ISO 8601 datetime format
 */
export function isValidISO8601(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString === date.toISOString();
}
