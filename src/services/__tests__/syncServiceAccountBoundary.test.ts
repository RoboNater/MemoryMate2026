/**
 * @jest-environment node
 *
 * Database-backed tests for the account-scoping and sign-out paths (issue #64) —
 * the invariant a past bug (#2) broke by leaking data across accounts on a
 * shared device. These run against the real sql.js schema harness; only
 * getDatabase is faked, so the SQL each function issues (the ownership filters,
 * the reconcile subquery, the sync_state LIKE sweep) is what is under test.
 */
import { openTestDatabase } from './testDatabase';
import { getDatabase, type AppDatabase } from '../database';
import {
  adoptUnownedRows,
  purgeRowsOwnedByOthers,
  reconcileShelfMembership,
  clearLocalDataOnSignOut,
} from '../syncService';

jest.mock('../database', () => ({
  ...jest.requireActual('../database'),
  getDatabase: jest.fn(),
}));
jest.mock('../supabaseClient', () => ({ supabase: null }));
jest.mock('../authService', () => ({ getCurrentSession: jest.fn() }));
jest.mock('@/store/verseStore', () => ({ useVerseStore: { getState: () => ({}) } }));
jest.mock('@/store/syncStore', () => ({ useSyncStore: { getState: () => ({}) } }));

const mockedGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;

let db: AppDatabase;

beforeEach(async () => {
  db = await openTestDatabase();
  mockedGetDatabase.mockReturnValue(db as any);
});

afterEach(async () => {
  await db.closeAsync();
});

const T = '2026-02-01T00:00:00.000Z';

async function addVerse(id: string, userId: string | null, shelfId: string | null = null) {
  await db.runAsync(
    `INSERT INTO verses (id, reference, text, translation, created_at, archived, shelf_id, user_id, updated_at, deleted_at)
     VALUES (?, 'r', 't', 'NIV', 'c', 0, ?, ?, ?, NULL)`,
    [id, shelfId, userId, T]
  );
}
async function addShelf(id: string, userId: string | null, deletedAt: string | null = null) {
  await db.runAsync(
    `INSERT INTO shelves (id, name, created_at, user_id, updated_at, deleted_at) VALUES (?, 'n', 'c', ?, ?, ?)`,
    [id, userId, T, deletedAt]
  );
}
async function setMeta(key: string, value: string) {
  await db.runAsync(`INSERT INTO sync_state (key, value) VALUES (?, ?)`, [key, value]);
}
const userIdOf = (table: string, id: string, idCol = 'id') =>
  db.getFirstAsync<{ user_id: string | null }>(`SELECT user_id FROM ${table} WHERE ${idCol} = ?`, [id]);
const rowExists = async (table: string, id: string, idCol = 'id') =>
  (await db.getFirstAsync(`SELECT 1 AS x FROM ${table} WHERE ${idCol} = ?`, [id])) !== null;

// ---------------------------------------------------------------------------

describe('adoptUnownedRows', () => {
  it('claims only unowned (user_id IS NULL) rows, never another account’s', async () => {
    await addVerse('own', null);
    await addVerse('theirs', 'user-other');
    await addVerse('mine', 'user-1');
    await addShelf('s-own', null);

    await adoptUnownedRows('user-1');

    expect(await userIdOf('verses', 'own')).toEqual({ user_id: 'user-1' });
    expect(await userIdOf('verses', 'theirs')).toEqual({ user_id: 'user-other' }); // untouched
    expect(await userIdOf('verses', 'mine')).toEqual({ user_id: 'user-1' });
    expect(await userIdOf('shelves', 's-own')).toEqual({ user_id: 'user-1' });
  });
});

describe('purgeRowsOwnedByOthers', () => {
  it('deletes rows owned by a different account, keeping own and unowned', async () => {
    await addVerse('mine', 'user-1');
    await addVerse('unowned', null);
    await addVerse('theirs', 'user-other');

    const purged = await purgeRowsOwnedByOthers('user-1');

    expect(purged).toBe(true);
    expect(await rowExists('verses', 'mine')).toBe(true);
    expect(await rowExists('verses', 'unowned')).toBe(true);
    expect(await rowExists('verses', 'theirs')).toBe(false);
  });

  it('returns false when nothing belongs to another account', async () => {
    await addVerse('mine', 'user-1');
    await addVerse('unowned', null);

    expect(await purgeRowsOwnedByOthers('user-1')).toBe(false);
  });

  it('purges a foreign account’s child rows too (progress/test_results)', async () => {
    await addVerse('theirs', 'user-other');
    await db.runAsync(
      `INSERT INTO progress (verse_id, times_practiced, times_tested, times_correct, comfort_level, user_id, updated_at)
       VALUES ('theirs', 0, 0, 0, 1, 'user-other', ?)`,
      [T]
    );

    await purgeRowsOwnedByOthers('user-1');

    expect(await rowExists('verses', 'theirs')).toBe(false);
    expect(await rowExists('progress', 'theirs', 'verse_id')).toBe(false);
  });
});

describe('reconcileShelfMembership', () => {
  it('clears a verse’s shelf_id when the shelf is tombstoned, and stamps updated_at', async () => {
    await addShelf('s-dead', 'user-1', '2026-02-02T00:00:00.000Z');
    await addVerse('v', 'user-1', 's-dead');

    const repaired = await reconcileShelfMembership();

    expect(repaired).toBe(1);
    const row = await db.getFirstAsync<any>('SELECT shelf_id, updated_at FROM verses WHERE id = ?', ['v']);
    expect(row.shelf_id).toBeNull();
    expect(row.updated_at).not.toBe(T); // bumped so the repair re-syncs
  });

  it('clears a verse’s shelf_id when the shelf is absent entirely', async () => {
    await addVerse('v', 'user-1', 's-ghost');

    expect(await reconcileShelfMembership()).toBe(1);
    expect((await db.getFirstAsync<any>('SELECT shelf_id FROM verses WHERE id = ?', ['v'])).shelf_id).toBeNull();
  });

  it('leaves a verse pointing at a live shelf untouched', async () => {
    await addShelf('s-live', 'user-1');
    await addVerse('v', 'user-1', 's-live');

    expect(await reconcileShelfMembership()).toBe(0);
    expect((await db.getFirstAsync<any>('SELECT shelf_id FROM verses WHERE id = ?', ['v'])).shelf_id).toBe('s-live');
  });

  it('ignores a tombstoned verse even if its shelf_id dangles', async () => {
    await addShelf('s-dead', 'user-1', '2026-02-02T00:00:00.000Z');
    await db.runAsync(
      `INSERT INTO verses (id, reference, text, translation, created_at, archived, shelf_id, user_id, updated_at, deleted_at)
       VALUES ('v', 'r', 't', 'NIV', 'c', 0, 's-dead', 'user-1', ?, '2026-02-02T00:00:00.000Z')`,
      [T]
    );

    expect(await reconcileShelfMembership()).toBe(0); // WHERE deleted_at IS NULL
  });
});

describe('clearLocalDataOnSignOut', () => {
  it('no-ops and preserves data when no account has ever synced (synced_user_id unset)', async () => {
    await addVerse('v', null); // never claimed or pushed — the only copy
    await setMeta('last_pulled_at:verses', T);

    const cleared = await clearLocalDataOnSignOut();

    expect(cleared).toBe(false);
    expect(await rowExists('verses', 'v')).toBe(true);
    expect(await db.getFirstAsync('SELECT value FROM sync_state WHERE key = ?', ['last_pulled_at:verses'])).not.toBeNull();
  });

  it('wipes synced tables and sync checkpoints once an account has synced, keeping unrelated prefs', async () => {
    await setMeta('synced_user_id', 'user-1');
    await addShelf('s', 'user-1');
    await addVerse('v', 'user-1', 's');
    await setMeta('last_pushed_at', T);
    await setMeta('last_pulled_at', T);
    await setMeta('last_pulled_at:verses', T);
    await setMeta('active_shelf_id', 's');
    await setMeta('practice_mode', 'guided'); // device-local pref, not user data (#34)

    const cleared = await clearLocalDataOnSignOut();

    expect(cleared).toBe(true);
    expect(await rowExists('verses', 'v')).toBe(false);
    expect(await rowExists('shelves', 's')).toBe(false);
    for (const key of ['synced_user_id', 'last_pushed_at', 'last_pulled_at', 'last_pulled_at:verses', 'active_shelf_id']) {
      expect(await db.getFirstAsync('SELECT value FROM sync_state WHERE key = ?', [key])).toBeNull();
    }
    // A device-local preference survives — it names no user data to leak.
    expect(await db.getFirstAsync('SELECT value FROM sync_state WHERE key = ?', ['practice_mode'])).toEqual({ value: 'guided' });
  });
});
