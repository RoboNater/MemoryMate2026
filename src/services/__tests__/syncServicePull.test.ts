/**
 * @jest-environment node
 *
 * Database-backed tests for the pull/merge half of the sync engine (issue #64).
 *
 * These run `pullAll` against a REAL schema-migrated SQLite database (the sql.js
 * harness in ./testDatabase), with only the Supabase client faked — at exactly
 * the boundary `fetchRemote` calls, the same way verseService.addVerses mocks
 * getDatabase. Everything the merge asserts (insert-vs-update, last-write-wins,
 * counter reconciliation, per-table watermarks, the skip-a-bad-row try/catch)
 * is executed as real SQL, not against a hand-rolled database mock.
 */
import { openTestDatabase } from './testDatabase';
import { getDatabase, type AppDatabase } from '../database';
import { pullAll } from '../syncService';

// Only getDatabase is faked; applySchema/runMigrations stay real so the harness
// migrates a real schema. (jest hoists these above the imports above.)
jest.mock('../database', () => ({
  ...jest.requireActual('../database'),
  getDatabase: jest.fn(),
}));
// Keep importing syncService cheap and free of react-native: it pulls these at
// module load, and none are exercised when calling pullAll directly.
jest.mock('../supabaseClient', () => ({ supabase: null }));
jest.mock('../authService', () => ({ getCurrentSession: jest.fn() }));
jest.mock('@/store/verseStore', () => ({
  useVerseStore: { getState: () => ({}) },
}));
jest.mock('@/store/syncStore', () => ({
  useSyncStore: { getState: () => ({}) },
}));

const mockedGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;

type Table = 'shelves' | 'verses' | 'progress' | 'test_results';

/**
 * A Supabase stand-in that honours the exact chain fetchRemote calls:
 *   client.from(table).select('*').gte('updated_at', since).order('updated_at', ...)
 * It filters `>= since` and sorts ascending, so the inclusive-cursor and
 * watermark behaviour is modelled faithfully rather than short-circuited.
 */
function fakeSupabase(remote: Partial<Record<Table, any[]>>) {
  return {
    from(table: Table) {
      let rows = (remote[table] ?? []).slice();
      const builder: any = {
        select: () => builder,
        gte: (_col: string, since: string) => {
          rows = rows.filter((r) => Date.parse(r.updated_at) >= Date.parse(since));
          return builder;
        },
        order: (_col: string, { ascending }: { ascending: boolean }) => {
          rows.sort((a, b) =>
            ascending
              ? Date.parse(a.updated_at) - Date.parse(b.updated_at)
              : Date.parse(b.updated_at) - Date.parse(a.updated_at)
          );
          return Promise.resolve({ data: rows, error: null });
        },
      };
      return builder;
    },
  } as any;
}

let db: AppDatabase;

beforeEach(async () => {
  db = await openTestDatabase();
  mockedGetDatabase.mockReturnValue(db as any);
});

afterEach(async () => {
  await db.closeAsync();
});

// --- local-row seeding helpers (full schema column lists) --------------------

async function insertVerse(v: {
  id: string;
  reference?: string;
  text?: string;
  shelf_id?: string | null;
  archived?: number;
  updated_at: string;
  deleted_at?: string | null;
}) {
  await db.runAsync(
    `INSERT INTO verses (id, reference, text, translation, created_at, archived, shelf_id, user_id, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      v.id,
      v.reference ?? 'John 3:16',
      v.text ?? 'For God so loved the world',
      'NIV',
      '2026-01-01T00:00:00.000Z',
      v.archived ?? 0,
      v.shelf_id ?? null,
      'user-1',
      v.updated_at,
      v.deleted_at ?? null,
    ]
  );
}

async function insertProgress(p: {
  verse_id: string;
  times_practiced?: number;
  times_tested?: number;
  times_correct?: number;
  comfort_level?: number;
  last_practiced?: string | null;
  last_tested?: string | null;
  updated_at: string;
  deleted_at?: string | null;
}) {
  // Progress rows carry a FK to verses (enforced here) — seed the parent verse.
  await db.runAsync(
    `INSERT OR IGNORE INTO verses (id, reference, text, translation, created_at, archived, shelf_id, user_id, updated_at, deleted_at)
     VALUES (?, 'r', 't', 'NIV', '2026-01-01T00:00:00.000Z', 0, NULL, 'user-1', '2026-01-01T00:00:00.000Z', NULL)`,
    [p.verse_id]
  );
  await db.runAsync(
    `INSERT INTO progress (verse_id, times_practiced, times_tested, times_correct,
       last_practiced, last_tested, comfort_level, user_id, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      p.verse_id,
      p.times_practiced ?? 0,
      p.times_tested ?? 0,
      p.times_correct ?? 0,
      p.last_practiced ?? null,
      p.last_tested ?? null,
      p.comfort_level ?? 1,
      'user-1',
      p.updated_at,
      p.deleted_at ?? null,
    ]
  );
}

const one = <T,>(sql: string, params: any[] = []) => db.getFirstAsync<T>(sql, params);
const meta = (key: string) =>
  db.getFirstAsync<{ value: string }>('SELECT value FROM sync_state WHERE key = ?', [key]);

// ---------------------------------------------------------------------------

describe('pullAll — insert branch', () => {
  it('inserts a remote shelf/verse/progress/test_result absent locally', async () => {
    const client = fakeSupabase({
      shelves: [{ id: 's1', name: 'Psalms', created_at: 'c', updated_at: '2026-02-01T00:00:00.000Z', deleted_at: null }],
      verses: [{ id: 'v1', reference: 'Ps 23:1', text: 'The LORD', translation: 'NIV', created_at: 'c', archived: false, shelf_id: 's1', updated_at: '2026-02-01T00:00:00.000Z', deleted_at: null }],
      progress: [{ verse_id: 'v1', times_practiced: 3, times_tested: 1, times_correct: 1, comfort_level: 2, last_practiced: null, last_tested: null, updated_at: '2026-02-01T00:00:00.000Z', deleted_at: null }],
      test_results: [{ id: 't1', verse_id: 'v1', timestamp: 'ts', passed: true, score: 0.9, updated_at: '2026-02-01T00:00:00.000Z', deleted_at: null }],
    });

    const { pulled } = await pullAll(client);

    expect(pulled).toBe(4);
    expect(await one('SELECT name FROM shelves WHERE id = ?', ['s1'])).toEqual({ name: 'Psalms' });
    expect(await one<any>('SELECT archived, shelf_id FROM verses WHERE id = ?', ['v1'])).toEqual({ archived: 0, shelf_id: 's1' });
    expect(await one<any>('SELECT times_practiced FROM progress WHERE verse_id = ?', ['v1'])).toEqual({ times_practiced: 3 });
    expect(await one<any>('SELECT passed, score FROM test_results WHERE id = ?', ['t1'])).toEqual({ passed: 1, score: 0.9 });
  });

  it('maps remote boolean archived=true to integer 1', async () => {
    const client = fakeSupabase({
      verses: [{ id: 'v1', reference: 'r', text: 't', translation: 'NIV', created_at: 'c', archived: true, shelf_id: null, updated_at: '2026-02-01T00:00:00.000Z', deleted_at: null }],
    });
    await pullAll(client);
    expect(await one<any>('SELECT archived FROM verses WHERE id = ?', ['v1'])).toEqual({ archived: 1 });
  });
});

describe('pullAll — last-write-wins gate (shelves/verses/test_results)', () => {
  it('applies a strictly newer remote row', async () => {
    await insertVerse({ id: 'v1', text: 'old', updated_at: '2026-02-01T00:00:00.000Z' });
    const client = fakeSupabase({
      verses: [{ id: 'v1', reference: 'r', text: 'new', translation: 'NIV', created_at: 'c', archived: false, shelf_id: null, updated_at: '2026-02-02T00:00:00.000Z', deleted_at: null }],
    });

    const { pulled } = await pullAll(client);

    expect(pulled).toBe(1);
    expect(await one<any>('SELECT text FROM verses WHERE id = ?', ['v1'])).toEqual({ text: 'new' });
  });

  it('ignores an older remote row (local wins)', async () => {
    await insertVerse({ id: 'v1', text: 'local', updated_at: '2026-02-05T00:00:00.000Z' });
    const client = fakeSupabase({
      verses: [{ id: 'v1', reference: 'r', text: 'stale', translation: 'NIV', created_at: 'c', archived: false, shelf_id: null, updated_at: '2026-02-01T00:00:00.000Z', deleted_at: null }],
    });

    const { pulled } = await pullAll(client);

    expect(pulled).toBe(0);
    expect(await one<any>('SELECT text FROM verses WHERE id = ?', ['v1'])).toEqual({ text: 'local' });
  });

  it('propagates a tombstone via a newer test_results update', async () => {
    await insertVerse({ id: 'v1', updated_at: '2026-01-01T00:00:00.000Z' });
    await db.runAsync(
      `INSERT INTO test_results (id, verse_id, timestamp, passed, score, user_id, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['t1', 'v1', 'ts', 1, 0.5, 'user-1', '2026-02-01T00:00:00.000Z', null]
    );
    const client = fakeSupabase({
      test_results: [{ id: 't1', verse_id: 'v1', timestamp: 'ts', passed: true, score: 0.5, updated_at: '2026-02-02T00:00:00.000Z', deleted_at: '2026-02-02T00:00:00.000Z' }],
    });

    await pullAll(client);

    expect(await one<any>('SELECT deleted_at FROM test_results WHERE id = ?', ['t1'])).toEqual({ deleted_at: '2026-02-02T00:00:00.000Z' });
  });
});

describe('pullAll — progress counter reconciliation (the one non-LWW rule)', () => {
  it('takes the max of each counter even when the remote row is OLDER', async () => {
    // Concurrent offline practice: local advanced practiced/correct, remote
    // advanced tested. Neither may lose increments.
    await insertProgress({ verse_id: 'v1', times_practiced: 5, times_tested: 2, times_correct: 4, comfort_level: 3, updated_at: '2026-02-05T00:00:00.000Z' });
    const client = fakeSupabase({
      progress: [{ verse_id: 'v1', times_practiced: 3, times_tested: 9, times_correct: 1, comfort_level: 1, last_practiced: null, last_tested: null, updated_at: '2026-02-01T00:00:00.000Z', deleted_at: null }],
    });

    const { pulled } = await pullAll(client);

    expect(pulled).toBe(1);
    const row = await one<any>('SELECT times_practiced, times_tested, times_correct, comfort_level, updated_at FROM progress WHERE verse_id = ?', ['v1']);
    expect(row).toEqual({
      times_practiced: 5, // local kept
      times_tested: 9, // remote higher
      times_correct: 4, // local kept
      comfort_level: 3, // point-in-time field follows the NEWER row (local)
      updated_at: '2026-02-05T00:00:00.000Z', // local, since local is newer
    });
  });

  it('follows the newer remote row for point-in-time fields while still maxing counters', async () => {
    await insertProgress({ verse_id: 'v1', times_practiced: 7, times_tested: 1, times_correct: 1, comfort_level: 2, updated_at: '2026-02-01T00:00:00.000Z' });
    const client = fakeSupabase({
      progress: [{ verse_id: 'v1', times_practiced: 2, times_tested: 1, times_correct: 1, comfort_level: 5, last_practiced: '2026-02-09T00:00:00.000Z', last_tested: null, updated_at: '2026-02-09T00:00:00.000Z', deleted_at: null }],
    });

    await pullAll(client);

    const row = await one<any>('SELECT times_practiced, comfort_level, last_practiced, updated_at FROM progress WHERE verse_id = ?', ['v1']);
    expect(row).toEqual({
      times_practiced: 7, // local counter kept (max), even though remote is newer
      comfort_level: 5, // remote (newer) wins point-in-time
      last_practiced: '2026-02-09T00:00:00.000Z',
      updated_at: '2026-02-09T00:00:00.000Z',
    });
  });

  it('writes nothing when the remote row is neither newer nor carries higher counters', async () => {
    await insertProgress({ verse_id: 'v1', times_practiced: 5, times_tested: 5, times_correct: 5, comfort_level: 3, updated_at: '2026-02-05T00:00:00.000Z' });
    const client = fakeSupabase({
      progress: [{ verse_id: 'v1', times_practiced: 1, times_tested: 1, times_correct: 1, comfort_level: 1, last_practiced: null, last_tested: null, updated_at: '2026-02-01T00:00:00.000Z', deleted_at: null }],
    });

    const { pulled } = await pullAll(client);

    expect(pulled).toBe(0); // no-op, not counted as a change
    expect(await one<any>('SELECT times_practiced, comfort_level FROM progress WHERE verse_id = ?', ['v1'])).toEqual({ times_practiced: 5, comfort_level: 3 });
  });
});

describe('pullAll — per-table watermark', () => {
  it('advances each table cursor to the newest updated_at it pulled', async () => {
    const client = fakeSupabase({
      shelves: [{ id: 's1', name: 'A', created_at: 'c', updated_at: '2026-02-03T00:00:00.000Z', deleted_at: null }],
      verses: [{ id: 'v1', reference: 'r', text: 't', translation: 'NIV', created_at: 'c', archived: false, shelf_id: null, updated_at: '2026-02-08T00:00:00.000Z', deleted_at: null }],
    });

    await pullAll(client);

    expect(await meta('last_pulled_at:shelves')).toEqual({ value: '2026-02-03T00:00:00.000Z' });
    expect(await meta('last_pulled_at:verses')).toEqual({ value: '2026-02-08T00:00:00.000Z' });
    // A table with nothing pulled advances no cursor.
    expect(await meta('last_pulled_at:progress')).toBeNull();
  });

  it('is idempotent: a second identical pull applies nothing and leaves the cursor put', async () => {
    const client = fakeSupabase({
      verses: [{ id: 'v1', reference: 'r', text: 't', translation: 'NIV', created_at: 'c', archived: false, shelf_id: null, updated_at: '2026-02-08T00:00:00.000Z', deleted_at: null }],
    });

    const first = await pullAll(client);
    const second = await pullAll(client);

    expect(first.pulled).toBe(1);
    expect(second.pulled).toBe(0);
    expect(await meta('last_pulled_at:verses')).toEqual({ value: '2026-02-08T00:00:00.000Z' });
  });
});

describe('pullAll — a row that fails to apply is skipped [characterization] (#67)', () => {
  // This pins the CURRENT skip-a-bad-row behaviour, it does not endorse it. The
  // try/catch keeps one corrupt row from aborting the whole sync — which is
  // wanted — but the watermark is noted from r.updated_at BEFORE the catch, so a
  // failed row followed by a newer successful one is advanced past and stranded
  // below the inclusive `>= since` cursor: permanent loss on this device. The
  // data-loss decision is tracked in #67; rewrite this test, don't delete it, if
  // that changes. The watermark assertion below documents the consequence.
  it('strands a failed row below the watermark, unrecoverable even after its parent verse arrives', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    // 'v-missing' has no verse, so its progress INSERT violates the FK and throws
    // inside the loop; 'v-ok' has a verse and applies.
    await insertVerse({ id: 'v-ok', updated_at: '2026-01-01T00:00:00.000Z' });
    const client = fakeSupabase({
      progress: [
        { verse_id: 'v-missing', times_practiced: 1, times_tested: 0, times_correct: 0, comfort_level: 1, last_practiced: null, last_tested: null, updated_at: '2026-02-01T00:00:00.000Z', deleted_at: null },
        { verse_id: 'v-ok', times_practiced: 4, times_tested: 0, times_correct: 0, comfort_level: 1, last_practiced: null, last_tested: null, updated_at: '2026-02-02T00:00:00.000Z', deleted_at: null },
      ],
    });

    const { pulled } = await pullAll(client);

    // The catch let the good row through and warned about the bad one.
    expect(pulled).toBe(1);
    expect(await one<any>('SELECT times_practiced FROM progress WHERE verse_id = ?', ['v-ok'])).toEqual({ times_practiced: 4 });
    expect(await one('SELECT verse_id FROM progress WHERE verse_id = ?', ['v-missing'])).toBeNull();
    expect(warn).toHaveBeenCalled();

    // Consequence (#67): the newer good row advanced the cursor PAST the failed
    // 2026-02-01 row...
    expect(await meta('last_pulled_at:progress')).toEqual({ value: '2026-02-02T00:00:00.000Z' });

    // ...so even after its missing parent verse arrives, a re-pull never recovers
    // it: the 2026-02-01 row now sits below the inclusive `>= since` cursor and is
    // filtered out at the source. That is the data loss.
    await insertVerse({ id: 'v-missing', updated_at: '2026-02-03T00:00:00.000Z' });
    const second = await pullAll(client);
    expect(second.pulled).toBe(0);
    expect(await one('SELECT verse_id FROM progress WHERE verse_id = ?', ['v-missing'])).toBeNull();

    warn.mockRestore();
  });
});
