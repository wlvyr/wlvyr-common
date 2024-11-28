/*---------------------------------------------------------------------------------------------
 *  Copyright (c) wlvyr. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ICipher } from "./icipher.js";
import sodium from "libsodium-wrappers-sumo";

/**
 * Using libsodium library, encrypt and decrypt objects using a password and salt.
 */
export class PasswordCipher extends ICipher {
  /**
   *
   * @param {string} password
   * @param {Uint8Array} salt
   */
  constructor(password, salt) {
    super();
    this.ready = sodium.ready;
    this.initPromise = this.#initializeAsync(password, salt);
  }

  /**
   *
   * @param {object} obj
   * @returns {Promise<string>}
   */
  async encryptAsync(obj) {
    await this.initPromise;

    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    const messageBytes = sodium.from_string(JSON.stringify(obj));

    const ciphertext = sodium.crypto_secretbox_easy(
      messageBytes,
      nonce,
      // @ts-ignore
      this.key
    );

    // Combine nonce + ciphertext (no salt)
    const combined = new Uint8Array(nonce.length + ciphertext.length);
    combined.set(nonce, 0);
    combined.set(ciphertext, nonce.length);

    return sodium.to_base64(combined); // Base64 opaque encrypted string
  }

  /**
   *
   * @param {string} encryptedObj
   * @returns {Promise<object>}
   */
  async decryptAsync(encryptedObj) {
    await this.initPromise;

    const combined = sodium.from_base64(encryptedObj);

    const nonceLength = sodium.crypto_secretbox_NONCEBYTES;
    const nonce = combined.slice(0, nonceLength);
    const ciphertext = combined.slice(nonceLength);

    const decrypted = sodium.crypto_secretbox_open_easy(
      ciphertext,
      nonce,
      // @ts-ignore
      this.key
    );

    if (!decrypted) {
      throw new Error("Failed to decrypt");
    }

    return JSON.parse(sodium.to_string(decrypted));
  }

  /**
   *
   * @param {string | Uint8Array} password
   * @param {Uint8Array} salt
   * @returns
   */
  async #initializeAsync(password, salt) {
    await sodium.ready;

    let x = "";

    if (
      !(salt instanceof Uint8Array) ||
      salt.length !== sodium.crypto_pwhash_SALTBYTES
    ) {
      throw new Error(
        `Salt must be a Uint8Array of length ${sodium.crypto_pwhash_SALTBYTES}`
      );
    }

    if (typeof password === "string") {
      // Convert password string to Uint8Array bytes
      password = sodium.from_string(password);
    }

    /** @type {Uint8Array<ArrayBufferLike>} */
    this.key = sodium.crypto_pwhash(
      sodium.crypto_secretbox_KEYBYTES, // output key length (32 bytes)
      password, // password Uint8Array
      salt, // 16-byte salt Uint8Array
      sodium.crypto_pwhash_OPSLIMIT_MODERATE, // ops limit (moderate)
      sodium.crypto_pwhash_MEMLIMIT_MODERATE, // mem limit (moderate)
      sodium.crypto_pwhash_ALG_DEFAULT // algorithm (Argon2id)
    );
  }
}
