/**
 * These tests pin one narrow contract of the bulk import path
 * (`verseService.addVerses`, #15), the one raised in PR #52's review: the row's
 * two timestamps are not the same clock.
 *
 * `updated_at` is what sync compares last-write-wins on, so the whole batch
 * shares one real timestamp -- staggering it would stamp most of an import in
 * the future, where it can outrank another device's later edit and re-push
 * past the watermark the current sync already captured. `created_at` is display
 * ordering only, and is staggered backwards so a newest-first list reads in
 * file order.
 *
 * Per AGENTS.md the database itself is deliberately not covered here: the
 * immediate boundary (`getDatabase`) is mocked, so nothing pulls in
 * expo-sqlite or sql.js. This is not a general test of verseService.
 */
import * as verseService from '../verseService';
import { getDatabase } from '../database';

jest.mock('../database', () => ({
  getDatabase: jest.fn(),
}));
// `uuid` ships ESM that jest-expo's transform doesn't cover, and the ids are
// not what these tests are about -- only that each row gets its own.
jest.mock('@/utils/uuid', () => {
  let n = 0;
  return { generateUUID: () => `id-${++n}` };
});

const mockedGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;

/** Column order of the INSERT in `addVerses`. */
const CREATED_AT = 4;
const UPDATED_AT = 7;

function fakeDatabase() {
  const inserts: any[][] = [];
  let transactions = 0;

  const db = {
    runAsync: jest.fn(async (_sql: string, params: any[]) => {
      inserts.push(params);
    }),
    withTransactionAsync: jest.fn(async (fn: () => Promise<void>) => {
      transactions += 1;
      await fn();
    }),
  };

  return { db, inserts, getTransactions: () => transactions };
}

describe('verseService.addVerses', () => {
  const entries = [
    { reference: 'John 3:16', text: 'For God so loved the world' },
    { reference: 'Psalm 23:1', text: 'The LORD is my shepherd' },
    { reference: 'Romans 12:1', text: 'Therefore, I urge you' },
  ];

  it('stamps the whole batch with one updated_at', async () => {
    const { db, inserts } = fakeDatabase();
    mockedGetDatabase.mockReturnValue(db as any);

    await verseService.addVerses(entries, 'NIV', null);

    const stamps = inserts.map((params) => params[UPDATED_AT]);
    expect(new Set(stamps).size).toBe(1);
  });

  it('never stamps updated_at in the future', async () => {
    const { db, inserts } = fakeDatabase();
    mockedGetDatabase.mockReturnValue(db as any);

    const before = Date.now();
    await verseService.addVerses(entries, 'NIV', null);
    const after = Date.now();

    for (const params of inserts) {
      const updatedAt = new Date(params[UPDATED_AT]).getTime();
      expect(updatedAt).toBeGreaterThanOrEqual(before);
      expect(updatedAt).toBeLessThanOrEqual(after);
    }
  });

  it('staggers created_at backwards, so a newest-first list reads in file order', async () => {
    const { db, inserts } = fakeDatabase();
    mockedGetDatabase.mockReturnValue(db as any);

    const verses = await verseService.addVerses(entries, 'NIV', null);

    const created = inserts.map((params) => new Date(params[CREATED_AT]).getTime());
    expect(created[0]).toBeGreaterThan(created[1]);
    expect(created[1]).toBeGreaterThan(created[2]);
    // ...and no row is created after the batch was written.
    for (const params of inserts) {
      expect(new Date(params[CREATED_AT]).getTime()).toBeLessThanOrEqual(
        new Date(params[UPDATED_AT]).getTime()
      );
    }
    // The returned rows carry the same timestamps that were written.
    expect(verses.map((v) => v.created_at)).toEqual(inserts.map((p) => p[CREATED_AT]));
  });

  it('writes every row inside a single transaction', async () => {
    const { db, inserts, getTransactions } = fakeDatabase();
    mockedGetDatabase.mockReturnValue(db as any);

    await verseService.addVerses(entries, 'NIV', 'shelf-1');

    expect(getTransactions()).toBe(1);
    expect(inserts).toHaveLength(3);
    expect(inserts.every((params) => params[6] === 'shelf-1')).toBe(true);
  });

  it('writes nothing for an empty list', async () => {
    const { db, inserts } = fakeDatabase();
    mockedGetDatabase.mockReturnValue(db as any);

    const verses = await verseService.addVerses([], 'NIV', null);

    expect(verses).toEqual([]);
    expect(inserts).toEqual([]);
  });
});
