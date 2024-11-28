/*---------------------------------------------------------------------------------------------
 *  Copyright (c) wlvyr. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ErrorMessages } from "@/src/error/error-messages.js";

/**
 * Interface-like base class for consolidating two objects.
 * Subclasses must implement the `consolidate` method.
 */
export class IObjectConsolidator {
  /**
   * Consolidates two objects together and returns a new object.
   * @abstract
   * @param {Object} object1 - The first object to consolidate.
   * @param {Object} object2 - The second object to consolidate.
   * @returns {Object} The consolidated object.
   * @throws {Error} If the method is not implemented by subclass.
   */
  consolidate(object1, object2) {
    throw new Error(ErrorMessages.Exceptions.NotImplemented);
  }
}

/**
 * Merges two objects using object spread syntax. Properties from object2
 * will override those in object1 if keys overlap.
 *
 * @param {Object} object1 - The base object.
 * @param {Object} object2 - The object whose properties override or extend object1.
 * @returns {Object} A new object that is the result of merging object1 and object2.
 */
export class ItemConsolidator extends IObjectConsolidator {
  constructor() {
    super();
  }

  /**
   * Consolidates two objects together and returns a new object.
   * @param {Object} object1
   * @param {Object} object2
   * @return {Object} consolidated item
   */
  consolidate(object1, object2) {
    return { ...object1, ...object2 };
  }
}
