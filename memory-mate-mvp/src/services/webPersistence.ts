/**
 * IndexedDB persistence layer for sql.js database blob.
 *
 * Stores the entire sql.js database as a Uint8Array in IndexedDB.
 * - On startup: loadDatabaseBlob() retrieves the saved blob
 * - After mutations: saveDatabaseBlob() persists the updated blob
 *
 * Uses raw IndexedDB API (no external dependencies).
 */

const DB_NAME = 'MemoryMateDB';
const STORE_NAME = 'databases';
const KEY = 'main';

/**
 * Load the database blob from IndexedDB.
 * Returns null if no saved blob exists yet.
 */
export async function loadDatabaseBlob(): Promise<Uint8Array | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;

      // Ensure the object store exists
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.close();
        resolve(null);
        return;
      }

      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getRequest = store.get(KEY);

      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => {
        db.close();
        resolve(getRequest.result || null);
      };
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Save the database blob to IndexedDB.
 */
export async function saveDatabaseBlob(data: Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;

      // Ensure the object store exists
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }

      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const putRequest = store.put(data, KEY);

      putRequest.onerror = () => reject(putRequest.error);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}
