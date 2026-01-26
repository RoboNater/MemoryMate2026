/**
 * Web-compatible SQLite adapter using sql.js.
 *
 * expo-sqlite relies on a Web Worker + OPFS backend that doesn't load
 * reliably under the Metro web bundler.  sql.js is a battle-tested
 * Emscripten/WASM port of SQLite that runs entirely in the main thread
 * and works in every modern browser.
 *
 * The adapter exposes the same async method signatures that our service
 * layer already calls on the expo-sqlite SQLiteDatabase object, so no
 * service code needs to change.
 *
 * NOTE: Data lives only in memory — it does not survive a page reload.
 * Persistent storage is provided by expo-sqlite on native (iOS/Android).
 */

export interface WebSQLiteDatabase {
  execAsync(source: string): Promise<void>;
  runAsync(
    source: string,
    params?: unknown[],
  ): Promise<{ changes: number; lastInsertRowId: number }>;
  getFirstAsync<T>(source: string, params?: unknown[]): Promise<T | null>;
  getAllAsync<T>(source: string, params?: unknown[]): Promise<T[]>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
  closeAsync(): Promise<void>;
}

export async function openWebDatabase(): Promise<WebSQLiteDatabase> {
  // Dynamic import so sql.js is never bundled for native platforms.
  const initSqlJs = (await import('sql.js')).default;

  const SQL = await initSqlJs({
    // Load the WASM binary from the official sql.js CDN.
    locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
  });

  const sqlDb = new SQL.Database();

  return {
    async execAsync(source: string): Promise<void> {
      sqlDb.run(source);
    },

    async runAsync(
      source: string,
      params?: unknown[],
    ): Promise<{ changes: number; lastInsertRowId: number }> {
      sqlDb.run(source, params as any);
      return {
        changes: sqlDb.getRowsModified(),
        lastInsertRowId: 0,
      };
    },

    async getFirstAsync<T>(
      source: string,
      params?: unknown[],
    ): Promise<T | null> {
      const stmt = sqlDb.prepare(source);
      if (params) stmt.bind(params as any);
      if (stmt.step()) {
        const obj = stmt.getAsObject();
        stmt.free();
        return obj as T;
      }
      stmt.free();
      return null;
    },

    async getAllAsync<T>(
      source: string,
      params?: unknown[],
    ): Promise<T[]> {
      const stmt = sqlDb.prepare(source);
      if (params) stmt.bind(params as any);
      const results: T[] = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject() as T);
      }
      stmt.free();
      return results;
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
  };
}
