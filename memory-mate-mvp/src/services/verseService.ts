import { getDatabase } from './database';
import { Verse } from '@/types';
import { generateUUID } from '@/utils/uuid';

/**
 * SQLite row type for verses (uses number for boolean)
 */
interface VerseRow {
  id: string;
  reference: string;
  text: string;
  translation: string;
  created_at: string;
  archived: number; // 0 or 1
}

/**
 * Convert SQLite row to Verse type
 */
function rowToVerse(row: VerseRow): Verse {
  return {
    ...row,
    archived: row.archived === 1,
  };
}

/**
 * Add a new verse
 */
export async function addVerse(
  reference: string,
  text: string,
  translation: string = 'NIV'
): Promise<Verse> {
  const db = getDatabase();
  const id = generateUUID();
  const created_at = new Date().toISOString();

  await db.runAsync(
    'INSERT INTO verses (id, reference, text, translation, created_at, archived) VALUES (?, ?, ?, ?, ?, ?)',
    [id, reference, text, translation, created_at, 0]
  );

  return { id, reference, text, translation, created_at, archived: false };
}

/**
 * Get a single verse by ID
 */
export async function getVerse(id: string): Promise<Verse | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<VerseRow>(
    'SELECT * FROM verses WHERE id = ?',
    [id]
  );
  return row ? rowToVerse(row) : null;
}

/**
 * Get all verses (optionally including archived)
 */
export async function getAllVerses(includeArchived = false): Promise<Verse[]> {
  const db = getDatabase();
  const query = includeArchived
    ? 'SELECT * FROM verses ORDER BY created_at DESC'
    : 'SELECT * FROM verses WHERE archived = 0 ORDER BY created_at DESC';
  const rows = await db.getAllAsync<VerseRow>(query);
  return rows.map(rowToVerse);
}

/**
 * Update verse fields
 */
export async function updateVerse(
  id: string,
  updates: Partial<Omit<Verse, 'id' | 'created_at'>>
): Promise<Verse | null> {
  const db = getDatabase();

  // Build update query dynamically
  const fields: string[] = [];
  const values: any[] = [];

  if ('reference' in updates) {
    fields.push('reference = ?');
    values.push(updates.reference);
  }
  if ('text' in updates) {
    fields.push('text = ?');
    values.push(updates.text);
  }
  if ('translation' in updates) {
    fields.push('translation = ?');
    values.push(updates.translation);
  }
  if ('archived' in updates) {
    fields.push('archived = ?');
    values.push(updates.archived ? 1 : 0);
  }

  if (fields.length === 0) {
    return getVerse(id);
  }

  values.push(id);
  const query = `UPDATE verses SET ${fields.join(', ')} WHERE id = ?`;

  await db.runAsync(query, values);
  return getVerse(id);
}

/**
 * Delete a verse (cascades to progress and test results)
 */
export async function removeVerse(id: string): Promise<boolean> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM verses WHERE id = ?', [id]);
  return true;
}

/**
 * Archive a verse (soft delete)
 */
export async function archiveVerse(id: string): Promise<boolean> {
  const db = getDatabase();
  await db.runAsync('UPDATE verses SET archived = 1 WHERE id = ?', [id]);
  return true;
}

/**
 * Unarchive a verse
 */
export async function unarchiveVerse(id: string): Promise<boolean> {
  const db = getDatabase();
  await db.runAsync('UPDATE verses SET archived = 0 WHERE id = ?', [id]);
  return true;
}
