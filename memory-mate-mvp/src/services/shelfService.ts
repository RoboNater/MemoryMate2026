import { getDatabase } from './database';
import { Shelf } from '@/types';
import { generateUUID } from '@/utils/uuid';

/**
 * Shelf service (issue #5): CRUD for named verse groups plus the device-local
 * "active shelf" preference used by the Practice and Test tabs.
 *
 * Shelves sync like verses (soft delete via deleted_at, last-write-wins on
 * updated_at). The ACTIVE shelf selection is deliberately NOT synced — which
 * set you're drilling on is per-device UI state — so it lives in the local
 * sync_state key/value table.
 */

/** sync_state key holding the active shelf id (absent/null = all verses). */
const ACTIVE_SHELF_KEY = 'active_shelf_id';

interface ShelfRow {
  id: string;
  name: string;
  created_at: string;
}

function rowToShelf(row: ShelfRow): Shelf {
  return { id: row.id, name: row.name, created_at: row.created_at };
}

/**
 * Get all shelves, oldest first (stable order for pickers).
 */
export async function getAllShelves(): Promise<Shelf[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<ShelfRow>(
    'SELECT * FROM shelves WHERE deleted_at IS NULL ORDER BY created_at ASC'
  );
  return rows.map(rowToShelf);
}

/**
 * Create a shelf.
 */
export async function addShelf(name: string): Promise<Shelf> {
  const db = getDatabase();
  const id = generateUUID();
  const created_at = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO shelves (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
    [id, name, created_at, created_at]
  );
  return { id, name, created_at };
}

/**
 * Rename a shelf.
 */
export async function renameShelf(id: string, name: string): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();
  await db.runAsync('UPDATE shelves SET name = ?, updated_at = ? WHERE id = ?', [
    name,
    now,
    id,
  ]);
}

/**
 * Delete a shelf. The shelf row is soft-deleted (tombstoned) so the deletion
 * syncs across devices, and member verses are un-shelved — never deleted or
 * archived — with their updated_at bumped so the unassignment syncs too.
 */
export async function removeShelf(id: string): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE verses SET shelf_id = NULL, updated_at = ? WHERE shelf_id = ? AND deleted_at IS NULL',
      [now, id]
    );
    await db.runAsync(
      'UPDATE shelves SET deleted_at = ?, updated_at = ? WHERE id = ?',
      [now, now, id]
    );
  });
  // If the deleted shelf was the active set, fall back to "all verses".
  if ((await getActiveShelfId()) === id) {
    await setActiveShelfId(null);
  }
}

/**
 * Read the device-local active shelf id (null = all verses).
 */
export async function getActiveShelfId(): Promise<string | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM sync_state WHERE key = ?',
    [ACTIVE_SHELF_KEY]
  );
  return row?.value ?? null;
}

/**
 * Persist the device-local active shelf id (null clears it = all verses).
 */
export async function setActiveShelfId(id: string | null): Promise<void> {
  const db = getDatabase();
  if (id === null) {
    await db.runAsync('DELETE FROM sync_state WHERE key = ?', [ACTIVE_SHELF_KEY]);
  } else {
    await db.runAsync(
      `INSERT INTO sync_state (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = ?`,
      [ACTIVE_SHELF_KEY, id, id]
    );
  }
}
