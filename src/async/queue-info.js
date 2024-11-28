/*---------------------------------------------------------------------------------------------
 *  Copyright (c) wlvyr. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { QueueStatus } from "./queue-status.js";

/**
 * Stores queue-related metadata for a command.
 */
export class QueueInfo {
  constructor() {
    /** @type {number} */
    this.attemptNo = 0;
    /** @type {number} */
    this.dateCreated = Date.now();
    /** @type {QueueStatus} */
    this.status = QueueStatus.Initial;

    // not yet implemented. create a Priority enum 1-10. 1 lowest, and 10 highest priority
    // this.priority = 0;
  }
}
