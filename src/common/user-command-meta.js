/*---------------------------------------------------------------------------------------------
 *  Copyright (c) wlvyr. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Metadata associated with a user command, such as uuid and timestamp.
 */
export class UserCommandMeta {
  /**
   * @param {string} resourceId - The associated resource ID.
   * @param {string | undefined} [contextId] - An optional context ID.
   */
  constructor(resourceId, contextId = undefined) {
    this.resourceId = resourceId;
    this.contextId = contextId;
    this.uuid = crypto.randomUUID();
    this.timestamp = new Date().getTime();

    this.isPatch = false;
    this.isSensitiveData = false;
  }

  // unique id of command or action.
  get ReferenceId() {
    return `${this.contextId ?? ''}${this.resourceId ?? ''}${this.uuid}`;
  }
}
