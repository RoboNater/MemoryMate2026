/**
 * Database-backed test harness (issue #64).
 *
 * Opens a *real* SQLite database in Node via sql.js and exposes it through the
 * same `AppDatabase` interface the service layer programs against, so the sync
 * merge logic can be exercised against real SQL — not a hand-rolled mock of the
 * database. Schema and migrations come from the production `applySchema`
 * (database.ts), so these tests break if the DDL or a migration drifts.
 *
 * Notes on the approach (the design question issue #64 settled):
 *   - We use sql.js — the same Emscripten SQLite the web adapter ships — rather
 *     than mocking `AppDatabase`, so the SQL itself is under test (the
 *     `NOT IN (SELECT ...)` in reconcileShelfMembership, the `LIKE` sweep in
 *     clearLocalDataOnSignOut, FK cascades, watermark rows).
 *   - We build a thin adapter over a bare sql.js handle instead of reusing
 *     `openWebDatabase`, whose debounced writes reach IndexedDB (issue #64's
 *     caveat 2). This harness has no persistence side.
 *   - We load sql.js's asm.js build, not the WASM build: the WASM module fails to
 *     instantiate under jest's environment ("out of memory"), while asm.js is the
 *     same SQLite and runs fine. It differs only in compilation target, so SQL
 *     semantics — the thing under test — are identical. Everything is in-process;
 *     there is no network access.
 *
 * This covers the web adapter's SQL and the shared merge logic, NOT
 * expo-sqlite's native transaction semantics — necessary, not sufficient, per
 * the "two backends, one interface" invariant in AGENTS.md.
 */
import { applySchema, type AppDatabase } from '../database';

// asm.js build (see the module comment): the WASM build cannot instantiate under
// jest, while asm.js is the same SQLite and does.
// The asm.js build is a CommonJS module with no type declarations; require it.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const initSqlJsAsm = require('sql.js/dist/sql-asm.js');

/** Build a thin AppDatabase over a bare sql.js handle (no persistence side). */
function adapt(sqlDb: any): AppDatabase {
  return {
    async execAsync(source: string): Promise<void> {
      sqlDb.run(source);
    },
    async runAsync(source: string, params?: any[]) {
      sqlDb.run(source, params ?? []);
      return { changes: sqlDb.getRowsModified(), lastInsertRowId: 0 };
    },
    async getFirstAsync<T>(source: string, params?: any[]): Promise<T | null> {
      const stmt = sqlDb.prepare(source);
      if (params) stmt.bind(params);
      const row = stmt.step() ? (stmt.getAsObject() as T) : null;
      stmt.free();
      return row;
    },
    async getAllAsync<T>(source: string, params?: any[]): Promise<T[]> {
      const stmt = sqlDb.prepare(source);
      if (params) stmt.bind(params);
      const rows: T[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as T);
      stmt.free();
      return rows;
    },
    async withTransactionAsync(task: () => Promise<void>): Promise<void> {
      sqlDb.run('BEGIN TRANSACTION');
      try {
        await task();
        sqlDb.run('COMMIT');
      } catch (e) {
        sqlDb.run('ROLLBACK');
        throw e;
      }
    },
    async closeAsync(): Promise<void> {
      sqlDb.close();
    },
    exportDatabase(): Uint8Array {
      return sqlDb.export();
    },
  };
}

/** Open a bare sql.js-backed AppDatabase with foreign keys on, no schema. */
export async function openBareTestDatabase(): Promise<AppDatabase> {
  const SQL = await initSqlJsAsm();
  const sqlDb = new SQL.Database();
  // Per-connection, like every real backend does on open (database.ts / webDatabase.ts).
  sqlDb.run('PRAGMA foreign_keys = ON;');
  return adapt(sqlDb);
}

/**
 * Open a schema-migrated AppDatabase: the production `applySchema` (fresh DDL +
 * runMigrations) applied to a fresh sql.js handle. This is what the merge tests
 * run against.
 */
export async function openTestDatabase(): Promise<AppDatabase> {
  const db = await openBareTestDatabase();
  await applySchema(db);
  return db;
}
