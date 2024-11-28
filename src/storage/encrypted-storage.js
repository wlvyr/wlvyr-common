/*---------------------------------------------------------------------------------------------
 *  Copyright (c) wlvyr. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ICipher } from "@/src/security/icipher.js";
import { IStorage } from "./istorage.js";

/**
 * Stores encrypted objects using a key-value pattern in a provided object store.
 */
export class EncryptedStorage extends IStorage {
  /**
   *
   * @param {ICipher} cipher
   * @param {IStorage} storage
   */
  constructor(cipher, storage) {
    super();
    this.cipher = cipher;
    this.storage = storage;
  }

  /**
   * Saves a serializable object under the specified key.
   *
   * @param {string} key - Unique identifier for the object. Should be namespaced per identity (e.g., user).
   * @param {Object} value - The object to save. Must be serializable.
   * @returns {Promise<void>} Resolves when the object has been successfully saved.
   * @throws {Error} Always throws unless implemented in a subclass.
   */
  async saveAsync(key, value) {
    const encryptedValue = await this.cipher.encryptAsync(value);
    return await this.storage.saveAsync(key, encryptedValue);
  }

  /**
   * Removes an object associated with the specified key.
   *
   * @param {string} key - Key of the object to remove.
   * @returns {Promise<void>} Resolves when the object has been successfully removed.
   * @throws {Error} Always throws unless implemented in a subclass.
   */
  async removeAsync(key) {
    return await this.storage.removeAsync(key);
  }

  /**
   * Loads the object associated with the specified key.
   *
   * @param {string} key - Key of the object to load.
   * @returns {Promise<Object|null>} Resolves to the object if found, or `null` if not found.
   * @throws {Error} Always throws unless implemented in a subclass.
   */
  async loadAsync(key) {
    const value = await this.storage.loadAsync(key);

    if (typeof value === "string") {
      return await this.cipher.decryptAsync(String(value));
    } else {
      return value;
    }
  }

  /**
   * Loads all objects whose keys start with the specified prefix.
   *
   * Useful for grouping related data (e.g., per user or session).
   *
   * @param {string} keyPrefix - Prefix used to match keys.
   * @returns {Promise<Object[]>} Resolves to an array of matching deserialized objects.
   * @throws {Error} Always throws unless implemented in a subclass.
   */
  async loadByKeyPrefixAsync(keyPrefix) {
    const encryptedValues = await this.storage.loadByKeyPrefixAsync(keyPrefix);

    return await Promise.all(
      encryptedValues.map((value) => {
        if (typeof value === "string") {
          return this.cipher.decryptAsync(String(value));
        } else {
          return value;
        }
      })
    );
  }
}
