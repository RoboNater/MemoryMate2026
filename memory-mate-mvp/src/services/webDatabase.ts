/**
 * Web-compatible SQLite adapter using sql.js with IndexedDB persistence.
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
 * Persistence: Data is automatically exported to IndexedDB after each mutation.
 * On startup, the saved blob is restored from IndexedDB, providing full data
 * persistence across page reloads (on web).
 */

import { saveDatabaseBlob } from './webPersistence';

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
  exportDatabase(): Uint8Array;
}

export async function openWebDatabase(
  savedBlob?: Uint8Array,
): Promise<WebSQLiteDatabase> {
  // Dynamic import so sql.js is never bundled for native platforms.
  const initSqlJs = (await import('sql.js')).default;

  const SQL = await initSqlJs({
    // Load the WASM binary from the official sql.js CDN.
    locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
  });

  // Initialize database from saved blob or create new empty database
  const sqlDb = savedBlob
    ? new SQL.Database(savedBlob)
    : new SQL.Database();

  // CRITICAL: Foreign keys must be enabled for EVERY connection.
  // In SQLite, PRAGMA foreign_keys is per-connection and does NOT persist
  // in the saved database blob, so it must be re-enabled after restoration.
  sqlDb.run('PRAGMA foreign_keys = ON;');

  // Debounce timer for save operations (prevent hammering IndexedDB)
  let saveTimeout: NodeJS.Timeout | null = null;

  /**
   * Schedule a debounced save to IndexedDB.
   * Consecutive writes within 500ms are batched into a single save.
   */
  const scheduleSave = () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      try {
        const blob = sqlDb.export();
        await saveDatabaseBlob(blob);
      } catch (error) {
        console.error('[MemoryMate] Failed to save database to IndexedDB:', error);
      }
    }, 500);
  };

  return {
    async execAsync(source: string): Promise<void> {
      sqlDb.run(source);
      scheduleSave();
    },

    async runAsync(
      source: string,
      params?: unknown[],
    ): Promise<{ changes: number; lastInsertRowId: number }> {
      sqlDb.run(source, params as any);
      scheduleSave();
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
        scheduleSave();
      } catch (e) {
        sqlDb.run('ROLLBACK');
        throw e;
      }
    },

    async closeAsync(): Promise<void> {
      // Flush any pending save before closing
      if (saveTimeout) {
        clearTimeout(saveTimeout);
        const blob = sqlDb.export();
        await saveDatabaseBlob(blob);
      }
      sqlDb.close();
    },

    exportDatabase(): Uint8Array {
      return sqlDb.export();
    },
  };
}
