/*---------------------------------------------------------------------------------------------
 *  Copyright (c) wlvyr. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IStorage } from "./istorage.js";

/**
 * IndexedDB-based implementation of IStorage.
 *
 * Stores objects using a key-value pattern in a specified object store.
 * Keys are mapped to `{ id: key, payload: value }` records for compatibility.
 */
export class IndexedDBStorage extends IStorage {
  /**
   * Constructs an IndexedDB storage backend.
   *
   * @param {number} dbVersion - Version of IndexedDB to use.
   * @param {string} dbName - The name of the IndexedDB database.
   * @param {string} storeId - The name of the object store to use within the database.
   */
  constructor(dbVersion, dbName, storeId) {
    super();
    this.dbVersion = dbVersion ?? 2;
    this.dbName = dbName;
    this.storeId = storeId;
    this.db = undefined;
  }

  /**
   * Initializes the IndexedDB database and creates the object store if necessary.
   *
   * Must be called before using other methods.
   *
   * Do not forget to await.
   *
   * @returns {Promise<void>} Resolves when the storage is initialized.
   */
  async initializeStorageAsync() {
    this.db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion); // Version number here is critical

      // This runs only if: - The database is new - Or version < 2 and needs to upgrade
      request.onupgradeneeded = (event) => {
        const db = /** @type {IDBOpenDBRequest} */ (event.target).result; // db is long-lived

        if (!db.objectStoreNames.contains(this.storeId)) {
          db.createObjectStore(this.storeId, { keyPath: "id" });
        }
      };

      request.onsuccess = (event) =>
        resolve(/** @type {IDBOpenDBRequest} */ (event.target).result);
      request.onerror = (event) =>
        reject(/** @type {IDBOpenDBRequest} */ (event.target).error);
    });
  }

  /**
   * Saves an object by key.
   *
   * Might be best for key to be tied to an identity (e.g. user)
   * @param {string} key - The key under which to store the object.
   * @param {Object} value - The object to store. Must be serializable.
   * @returns {Promise<void>} Resolves when successfully saved.
   */
  async saveAsync(key, value) {
    this.#ensureDbInitialized();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeId, "readwrite");
      const store = tx.objectStore(this.storeId);

      // put - save or update
      // add - exception if key exists.
      const request = store.put({ id: key, payload: value });

      request.onerror = () => reject(request.error);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Removes an object by key
   * @param {string} key - The key of the object to remove.
   * @returns {Promise<void>} Resolves when successfully deleted.
   */
  async removeAsync(key) {
    this.#ensureDbInitialized();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeId, "readwrite");
      const store = tx.objectStore(this.storeId);

      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Loads an object by key.
   *
   * @param {string} key - The key of the object to retrieve.
   * @returns {Promise<Object|null>} Resolves to the object if found, otherwise null.
   */
  async loadAsync(key) {
    this.#ensureDbInitialized();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeId, "readonly");
      const store = tx.objectStore(this.storeId);
      const request = store.get(key); // key is the value of the keyPath you're searching for
      request.onsuccess = () => resolve(request.result?.payload); // ensure save has payload set.
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Loads all items with keys that start with the given prefix using batched cursor iteration.
   *
   * @param {string} keyPrefix - The key prefix to search for.
   * @returns {Promise<Array<any>>} - A promise that resolves to an array of payloads.
   */
  async loadByKeyPrefixAsync(keyPrefix) {
    this.#ensureDbInitialized();

    /** @type {Array<any>} */
    const results = [];
    const batchSize = 50;

    let currentKey = keyPrefix;
    const upperBound = keyPrefix + "\uffff";
    let hasMore = true;

    while (hasMore) {
      /**
       * Load data in batches using a cursor.
       * @param {IDBValidKey|null} startKey
       * @param {number} batchSize
       * @returns {Promise<boolean>} - Resolves true if more data is available, false otherwise.
       */
      hasMore = await new Promise((resolve, reject) => {
        const tx = this.db.transaction(this.storeId, "readonly");
        const store = tx.objectStore(this.storeId);

        const range = IDBKeyRange.bound(currentKey, upperBound, false, false);
        const request = store.openCursor(range);

        let count = 0;

        /** @type {any|undefined} */
        let lastKey = undefined;
        /** @type {IDBCursorWithValue|null} */
        let cursor = null;

        request.onsuccess = (/** @type {Event} */ event) => {
          // Do not do any async calls here; it might close tx.
          cursor = /** @type {IDBRequest<IDBCursorWithValue>} */ (event.target)
            .result;

          // if not while, cursor.continue will wait for the next onsuccess.
          if (cursor && count < batchSize) {
            results.push(cursor.value.payload);
            lastKey = cursor.key;
            count++;
            cursor.continue();
          }
        };

        request.onerror = (/** @type {Event} */ event) =>
          reject(/** @type {IDBRequest} */ (event.target).error);

        tx.onabort = (/** @type {Event} */ event) => {
          const error = tx.error;
          // if (
          //   error?.name === "TimeoutError" ||
          //   (error?.name === "AbortError" &&
          //     (error?.message?.includes("") || error?.message?.includes("")))
          // ) {
          //   // Handle transaction timeout gracefully, e.g., resolve(false) to stop further batching
          //   resolve(false);
          // } else {
            // Reject for other abort reasons
            reject(error || new Error("Transaction aborted"));
          // }
        };

        tx.onerror = (/** @type {Event} */ event) =>
          reject(/** @type {IDBTransaction} */ (event.target).error);

        tx.oncomplete = () => {
          // cursor reached end OR lastKey was never set.
          if (cursor === null || lastKey === undefined) {
            resolve(false);
          } else {
            currentKey = lastKey;
            resolve(true);
          }
        };
      });
    }

    return results;
  }

  /**
   * Ensures the database has been initialized before performing operations.
   *
   * @throws {Error} Throws if the database is not initialized.
   */
  #ensureDbInitialized() {
    if (!this.db)
      throw new Error(
        "DB not initialized. Call initializeStorageAsync() first."
      );
  }
}
