/*---------------------------------------------------------------------------------------------
 *  Copyright (c) wlvyr. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ErrorMessages } from "@/src/error/error-messages.js";
import { UserCommandMeta } from "./user-command-meta.js";

/**
 * Represents a user command to be executed.
 */
export class UserCommand {
  /**
   * @param {string} type - The type of command.
   * @param {object} [payload={}] - The command payload.
   * @param {UserCommandMeta | { resourceId: string, contextId?: string, isPatch?: boolean, isSensitiveData?: boolean }} [meta={ resourceId: "system" }] - Metadata about the command.
   */
  constructor(type, payload = {}, meta = { resourceId: "system" }) {
    this.type = type; // command/action type
    this.payload = payload;

    if (meta instanceof UserCommandMeta) {
      this.meta = meta;
    } else if (meta && typeof meta === "object" && !Array.isArray(meta)) {
      const resourceId = meta.resourceId || "system"; // fallback
      const metadata = new UserCommandMeta(resourceId);
      Object.assign(metadata, meta);
      this.meta = metadata;
    } else {
      throw new Error(`meta ${ErrorMessages.Exceptions.ValueNotvalid}`);
    }

    /**
     * @typedef {Object} onExecute
     * @property {function | undefined} resolve - The function used to resolve the promise.
     * @property {Promise<boolean> | undefined} promise - The promise object that will be resolved.
     * @property {boolean} executed - Indicates whether the completion has occurred.
     * @property {boolean|undefined} result - result of the executed command.
     */

    /**
     * @type {onExecute}
     */
    this._onExecute = {
      resolve: undefined,
      promise: undefined,
      executed: false,
      result: undefined,
    };
  }

  /**
 * Returns a promise that resolves when the executed method is invoked. 
 * If the command has already been executed, it resolves with the stored result.
 * @returns {Promise<boolean|undefined>} A promise resolving to a boolean value: 
 * true when execution is successful, and false if not.
 */
  onExecute = () => {
    if (this._onExecute.executed) {
      return Promise.resolve(this._onExecute.result);
    }

    if (!this._onExecute.promise) {
      this._onExecute.promise = new Promise((resolve) => {
        this._onExecute.resolve = resolve;
      });
    }

    return this._onExecute.promise;
  };

  /**
   * Resolves the UserCommand
   * @param {boolean} success
   */
  executed = (success) => {
    if (this._onExecute.resolve) {
      this._onExecute.resolve(success);
      this._onExecute.executed = true;
      this._onExecute.result = success;

      // Clean up to prevent memory leaks and multiple executions
      this._onExecute.resolve = undefined;
      this._onExecute.promise = undefined;
    }
  };
}
