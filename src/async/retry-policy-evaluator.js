/*---------------------------------------------------------------------------------------------
 *  Copyright (c) wlvyr. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { UserCommand } from "@/src/common/user-command.js";
import { QueueInfo } from "./queue-info.js";
import { IRetryCondition } from "./retry-condition.js";

/**
 * Evaluates whether a command should be retried based on retry conditions.
 */
export class RetryPolicyEvaluator {
  /**
   * @param {IRetryCondition[]} [conditions=[]]
   */
  constructor(conditions = []) {
    this.conditions = conditions;
  }

  /**
   * Determines if a retry should occur.
   * @param {UserCommand} command
   * @param {QueueInfo} info
   * @returns {boolean}
   */
  shouldRetry(command, info) {
    return this.conditions.some((condition) =>
      condition.shouldRetry(command, info)
    );
  }

  /**
   * Adds a retry condition.
   * @param {IRetryCondition} condition
   */
  addCondition(condition) {
    this.conditions.push(condition);
  }
}
