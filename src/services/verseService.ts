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
  shelf_id: string | null;
}

/**
 * Convert SQLite row to Verse type.
 * Maps fields explicitly so internal sync columns (user_id/updated_at/deleted_at)
 * never leak into the public Verse domain object.
 */
function rowToVerse(row: VerseRow): Verse {
  return {
    id: row.id,
    reference: row.reference,
    text: row.text,
    translation: row.translation,
    created_at: row.created_at,
    archived: row.archived === 1,
    shelf_id: row.shelf_id ?? null,
  };
}

/**
 * Add a new verse
 */
export async function addVerse(
  reference: string,
  text: string,
  translation: string = 'NIV',
  shelfId: string | null = null
): Promise<Verse> {
  const db = getDatabase();
  const id = generateUUID();
  const created_at = new Date().toISOString();

  // New rows start their change-tracking clock at creation time.
  await db.runAsync(
    'INSERT INTO verses (id, reference, text, translation, created_at, archived, shelf_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, reference, text, translation, created_at, 0, shelfId, created_at]
  );

  return { id, reference, text, translation, created_at, archived: false, shelf_id: shelfId };
}

/**
 * Add many verses at once, all sharing a translation and shelf (issue #15).
 *
 * One transaction: a bulk import either lands or it doesn't. Half a file is
 * the worst outcome here -- the user's own file is the record of what they
 * meant to add, and a partial import makes them diff it against the app by
 * hand to find out where it stopped.
 *
 * Each row gets its own id, and a `created_at` one millisecond after the row
 * before it -- which is also its starting `updated_at`, exactly as `addVerse`
 * does. The stagger is what keeps the import's order stable: verse lists sort
 * on `created_at`, and a batch that shared one timestamp would come back in
 * whatever order the two database backends happened to produce.
 *
 * Progress rows are not created: `progressService.getProgress` already returns
 * a default for a verse that has none, and every other path here creates them
 * lazily too.
 */
export async function addVerses(
  entries: { reference: string; text: string }[],
  translation: string,
  shelfId: string | null = null
): Promise<Verse[]> {
  const db = getDatabase();
  const startedAt = Date.now();

  const verses: Verse[] = entries.map((entry, index) => ({
    id: generateUUID(),
    reference: entry.reference,
    text: entry.text,
    translation,
    created_at: new Date(startedAt + index).toISOString(),
    archived: false,
    shelf_id: shelfId,
  }));

  await db.withTransactionAsync(async () => {
    for (const verse of verses) {
      await db.runAsync(
        'INSERT INTO verses (id, reference, text, translation, created_at, archived, shelf_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          verse.id,
          verse.reference,
          verse.text,
          translation,
          verse.created_at,
          0,
          shelfId,
          verse.created_at,
        ]
      );
    }
  });

  return verses;
}

/**
 * Get a single verse by ID
 */
export async function getVerse(id: string): Promise<Verse | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<VerseRow>(
    'SELECT * FROM verses WHERE id = ? AND deleted_at IS NULL',
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
    ? 'SELECT * FROM verses WHERE deleted_at IS NULL ORDER BY created_at DESC'
    : 'SELECT * FROM verses WHERE archived = 0 AND deleted_at IS NULL ORDER BY created_at DESC';
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
  if ('shelf_id' in updates) {
    fields.push('shelf_id = ?');
    values.push(updates.shelf_id ?? null);
  }

  if (fields.length === 0) {
    return getVerse(id);
  }

  // Bump the change-tracking marker on every real update.
  fields.push('updated_at = ?');
  values.push(new Date().toISOString());

  values.push(id);
  const query = `UPDATE verses SET ${fields.join(', ')} WHERE id = ?`;

  await db.runAsync(query, values);
  return getVerse(id);
}

/**
 * Delete a verse and all related data (progress and test results).
 *
 * This is a SOFT delete: rows are tombstoned via deleted_at rather than removed,
 * so the deletion can propagate to other devices on the next sync (docs/architecture/sync.md).
 * All reads filter on `deleted_at IS NULL`, so tombstoned rows are invisible to
 * the app. Wrapped in a transaction for all-or-nothing behavior across platforms.
 */
export async function removeVerse(id: string): Promise<boolean> {
  const db = getDatabase();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE test_results SET deleted_at = ?, updated_at = ? WHERE verse_id = ? AND deleted_at IS NULL',
      [now, now, id]
    );
    await db.runAsync(
      'UPDATE progress SET deleted_at = ?, updated_at = ? WHERE verse_id = ? AND deleted_at IS NULL',
      [now, now, id]
    );
    await db.runAsync(
      'UPDATE verses SET deleted_at = ?, updated_at = ? WHERE id = ?',
      [now, now, id]
    );
  });

  return true;
}

/**
 * Archive a verse (user-facing hide; distinct from the deleted_at sync tombstone)
 */
export async function archiveVerse(id: string): Promise<boolean> {
  const db = getDatabase();
  const now = new Date().toISOString();
  await db.runAsync('UPDATE verses SET archived = 1, updated_at = ? WHERE id = ?', [now, id]);
  return true;
}

/**
 * Unarchive a verse
 */
export async function unarchiveVerse(id: string): Promise<boolean> {
  const db = getDatabase();
  const now = new Date().toISOString();
  await db.runAsync('UPDATE verses SET archived = 0, updated_at = ? WHERE id = ?', [now, id]);
  return true;
}
