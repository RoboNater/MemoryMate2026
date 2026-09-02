/**
 * @jest-environment node
 *
 * Database-backed tests for runMigrations (issue #64). The migration comment
 * asserts it is "additive, idempotent" and "safe to run on every startup"; until
 * now nothing checked that. These run the REAL runMigrations against a bare
 * sql.js database seeded with a PRE-sync-era schema — the shape a database
 * created before cross-device sync existed actually had — and assert the columns
 * appear, existing data is backfilled not destroyed, and a second run is a no-op.
 */
import { openBareTestDatabase } from './testDatabase';
import { runMigrations, type AppDatabase } from '../database';

let db: AppDatabase;

/** Seed the pre-sync-era schema: no user_id / updated_at / deleted_at, no shelf_id. */
async function seedLegacySchema() {
  await db.execAsync(`
    CREATE TABLE verses (
      id TEXT PRIMARY KEY,
      reference TEXT NOT NULL,
      text TEXT NOT NULL,
      translation TEXT NOT NULL DEFAULT 'NIV',
      created_at TEXT NOT NULL,
      archived INTEGER NOT NULL DEFAULT 0
    );
  `);
  await db.execAsync(`
    CREATE TABLE progress (
      verse_id TEXT PRIMARY KEY,
      times_practiced INTEGER NOT NULL DEFAULT 0,
      times_tested INTEGER NOT NULL DEFAULT 0,
      times_correct INTEGER NOT NULL DEFAULT 0,
      last_practiced TEXT,
      last_tested TEXT,
      comfort_level INTEGER NOT NULL DEFAULT 1
    );
  `);
  await db.execAsync(`
    CREATE TABLE test_results (
      id TEXT PRIMARY KEY,
      verse_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      passed INTEGER NOT NULL,
      score REAL
    );
  `);
}

const columnNames = (table: string) =>
  db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`).then((cols) => cols.map((c) => c.name));

beforeEach(async () => {
  db = await openBareTestDatabase();
  await seedLegacySchema();
});

afterEach(async () => {
  await db.closeAsync();
});

describe('runMigrations — additive columns', () => {
  it('adds the sync metadata columns to every synced table', async () => {
    await runMigrations(db);

    for (const table of ['verses', 'progress', 'test_results']) {
      const cols = await columnNames(table);
      expect(cols).toEqual(expect.arrayContaining(['user_id', 'updated_at', 'deleted_at']));
    }
    // verses additionally gains the shelf grouping column (issue #5).
    expect(await columnNames('verses')).toContain('shelf_id');
  });

  it('creates the sync_state checkpoint table', async () => {
    await runMigrations(db);
    const t = await db.getFirstAsync(`SELECT name FROM sqlite_master WHERE type='table' AND name='sync_state'`);
    expect(t).toEqual({ name: 'sync_state' });
  });
});

describe('runMigrations — backfill preserves existing data', () => {
  it('backfills updated_at from each row’s own baseline timestamp without dropping rows', async () => {
    await db.runAsync(
      `INSERT INTO verses (id, reference, text, translation, created_at, archived) VALUES ('v1', 'r', 't', 'NIV', '2026-01-05T00:00:00.000Z', 0)`
    );
    await db.runAsync(
      `INSERT INTO test_results (id, verse_id, timestamp, passed, score) VALUES ('t1', 'v1', '2026-01-06T00:00:00.000Z', 1, 0.5)`
    );
    await db.runAsync(
      `INSERT INTO progress (verse_id, times_practiced, times_tested, times_correct, last_practiced, last_tested, comfort_level)
       VALUES ('v1', 2, 1, 1, NULL, '2026-01-07T00:00:00.000Z', 3)`
    );

    await runMigrations(db);

    // verses.updated_at <- created_at, test_results.updated_at <- timestamp.
    expect(await db.getFirstAsync<any>(`SELECT updated_at FROM verses WHERE id = 'v1'`)).toEqual({ updated_at: '2026-01-05T00:00:00.000Z' });
    expect(await db.getFirstAsync<any>(`SELECT updated_at FROM test_results WHERE id = 't1'`)).toEqual({ updated_at: '2026-01-06T00:00:00.000Z' });
    // progress.updated_at <- COALESCE(last_tested, last_practiced, now).
    expect(await db.getFirstAsync<any>(`SELECT updated_at FROM progress WHERE verse_id = 'v1'`)).toEqual({ updated_at: '2026-01-07T00:00:00.000Z' });
    // Data survived (the migration is additive, not a rewrite).
    expect(await db.getFirstAsync<any>(`SELECT text FROM verses WHERE id = 'v1'`)).toEqual({ text: 't' });
  });
});

describe('runMigrations — idempotent', () => {
  it('runs twice without error and changes nothing the second time', async () => {
    await db.runAsync(
      `INSERT INTO verses (id, reference, text, translation, created_at, archived) VALUES ('v1', 'r', 't', 'NIV', '2026-01-05T00:00:00.000Z', 0)`
    );

    await runMigrations(db);
    const afterFirst = await db.getFirstAsync<any>(`SELECT * FROM verses WHERE id = 'v1'`);
    const colsFirst = await columnNames('verses');

    // A second run must be a safe no-op — every step guarded by "if missing".
    await expect(runMigrations(db)).resolves.not.toThrow();

    expect(await columnNames('verses')).toEqual(colsFirst); // no duplicate columns
    expect(await db.getFirstAsync<any>(`SELECT * FROM verses WHERE id = 'v1'`)).toEqual(afterFirst); // updated_at not re-stamped
    expect(await db.getAllAsync(`SELECT id FROM verses`)).toHaveLength(1);
  });
});
