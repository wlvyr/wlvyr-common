/*---------------------------------------------------------------------------------------------
 *  Copyright (c) wlvyr. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Interface for a generic asynchronous storage mechanism.
 *
 * Intended to be subclassed with platform-specific implementations.
 * Keys should ideally be namespaced (e.g., per user) to avoid collisions.
 */
export class IStorage {
  /**
   * Saves a serializable object under the specified key.
   *
   * @param {string} key - Unique identifier for the object. Should be namespaced per identity (e.g., user).
   * @param {Object} value - The object to save. Must be serializable.
   * @returns {Promise<void>} Resolves when the object has been successfully saved.
   * @throws {Error} Always throws unless implemented in a subclass.
   */
  async saveAsync(key, value) {
    throw new Error("Not implemented");
  }

  /**
   * Removes an object associated with the specified key.
   *
   * @param {string} key - Key of the object to remove.
   * @returns {Promise<void>} Resolves when the object has been successfully removed.
   * @throws {Error} Always throws unless implemented in a subclass.
   */
  async removeAsync(key) {
    throw new Error("Not implemented");
  }

  /**
   * Loads the object associated with the specified key.
   *
   * @param {string} key - Key of the object to load.
   * @returns {Promise<Object|null>} Resolves to the object if found, or `null` if not found.
   * @throws {Error} Always throws unless implemented in a subclass.
   */
  async loadAsync(key) {
    throw new Error("Not implemented");
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
    throw new Error("Not implemented");
  }
}
