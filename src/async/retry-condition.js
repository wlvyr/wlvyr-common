/*---------------------------------------------------------------------------------------------
 *  Copyright (c) wlvyr. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { UserCommand } from "@/src/common/user-command.js";
import { ErrorMessages } from "@/src/error/error-messages.js";
import { QueueInfo } from "./queue-info.js";

/**
 * Interface for retry condition implementations.
 * @interface
 */
export class IRetryCondition {
  /**
   * Should be overridden to determine if a retry is needed.
   * @param {UserCommand} command
   * @param {QueueInfo} info
   * @returns {boolean}
   */
  shouldRetry(command, info) {
    throw new Error(ErrorMessages.Exceptions.NotImplemented);
  }
}

/**
 * Retry condition based on attempt number.
 */
export class AttempNoRetryCondition extends IRetryCondition {
  /**
   * @param {number} [retryCount=0]
   */
  constructor(retryCount = 0) {
    super();
    this.retryCount = retryCount;
  }

  /**
   * @override
   * @param {UserCommand} command
   * @param {QueueInfo} info
   * @returns {boolean}
   */
  shouldRetry(command, info) {
    return info.attemptNo < this.retryCount;
  }
}
