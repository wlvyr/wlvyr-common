/*---------------------------------------------------------------------------------------------
 *  Copyright (c) wlvyr. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { QueueInfo } from "./queue-info.js";
import { UserCommand } from "@/src/common/user-command.js";
import { ErrorMessages } from "@/src/error/error-messages.js";

/**
 * @typedef {import('./queue-status.js').QueueStatus} QueueStatus
 */

/**
 * Represents a single item in the queue.
 */
export class QueueCommand {
  /**
   * @param {UserCommand} userCommand
   */
  constructor(userCommand) {
    if (userCommand == undefined) {
      throw new TypeError(
        `${ErrorMessages.Exceptions.ArgumentUndefinedException}, "userCommand"`
      );
    }
    /** @type {UserCommand} */
    this.command = userCommand;
    /** @type {QueueInfo} */
    this.queueInfo = new QueueInfo();

    /**
     * @typedef {Object} OnComplete
     * @property {function | undefined} resolve - The function used to resolve the promise.
     * @property {Promise<boolean> | undefined} promise - The promise object that will be resolved.
     * @property {boolean} completed - Indicates whether the completion has occurred.
     * @property {boolean|undefined} result - result of the executed command.
     */

    /**
     * @type {OnComplete}
     */
    this._onComplete = {
      resolve: undefined,
      promise: undefined,
      completed: false,
      result: undefined,
    };

    this._onStatusUpdateListeners = new Set();
  }

  /**
   *
   * @param {(success:boolean)=>{}} listener
   */
  addOnStatusUpdate = (listener) => {
    this._onStatusUpdateListeners.add(listener);
  };

  /**
   *
   * @param {(success:boolean)=>{}} listener
   */
  removeOnStatusUpdate = (listener) => {
    this._onStatusUpdateListeners.delete(listener);
  };

  /**
   * Returns a promise that resolves when the completion event occurs.
   *
   * @returns {Promise<boolean>} A promise that resolves to `true` when the
   * completion event is successful, or `false` if it is unsuccessful.
   */
  onComplete = () => {
    if (this._onComplete.completed) {
      /** @ts-ignore */
      return Promise.resolve(this._onComplete.result);
    }

    if (!this._onComplete.promise) {
      this._onComplete.promise = new Promise((resolve) => {
        this._onComplete.resolve = resolve;
      });
    }

    return this._onComplete.promise;
  };

  /**
   * Resolves the QueueCommand as completed.
   * @param {boolean} success
   */
  completed = (success) => {
    if (this._onComplete.resolve) {
      this._onComplete.resolve(success);
      this._onComplete.completed = true;
      this._onComplete.result = success;

      this._onComplete.resolve = undefined;
      this._onComplete.promise = undefined;
    }
  };

  /**
   * Callback action when QueueCommand status is updated
   * @param {QueueStatus} status
   */
  onStatusUpdate = (status) => {
    const listeners = this._onStatusUpdateListeners;

    for (const listener of listeners) {
      listener(status);
    }
  };
}
