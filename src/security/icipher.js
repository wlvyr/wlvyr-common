/*---------------------------------------------------------------------------------------------
 *  Copyright (c) wlvyr. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Interface-like abstract class for encryption and decryption.
 * 
 * Implementations should provide asynchronous methods to encrypt
 * and decrypt objects to/from string representations.
 */
export class ICipher {
  /**
   * Encrypts an object asynchronously.
   *
   * @param {object} obj - The object to encrypt.
   * @returns {Promise<string>} A promise that resolves to the encrypted string representation of the object.
   * @throws {Error} Throws an error if the method is not implemented.
   */
  async encryptAsync(obj) {
    throw new Error("Not implemented");
  }

  /**
   * Decrypts an encrypted string asynchronously.
   *
   * @param {string} encryptedObj - The encrypted string to decrypt.
   * @returns {Promise<object>} A promise that resolves to the decrypted object.
   * @throws {Error} Throws an error if the method is not implemented.
   */
  async decryptAsync(encryptedObj) {
    throw new Error("Not implemented");
  }
}
