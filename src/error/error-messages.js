/*---------------------------------------------------------------------------------------------
 *  Copyright (c) wlvyr. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as enlang from "@/src/lang/en.json" with { type: "json" };;

/**
 * @type {{ [key: string]: any }}
 */
export const ErrorMessages = {
  Exceptions: {
    ArgumentUndefinedException: undefined,
    ArgumentNullException: undefined,
    ValueNotvalid: undefined,
    NotImplemented: undefined,
  },
  Network: {
    Request: {
      // resource.js toQueryString, when passing an Array.
      QueryObjInvalid: undefined,
      BadRequest: undefined,
      Aborted: undefined,
    },
    NetworkError: undefined,
  },
};

/**
 * @param {{ [key: string]: any }} errorMessages
 */
const setErrorMessages = (errorMessages) => {
  for (let propertyName of Object.getOwnPropertyNames(errorMessages)) {
    if (Object.hasOwn(ErrorMessages, propertyName)) {
      ErrorMessages[propertyName] = errorMessages[propertyName];
    }
  }
};

// default language is en
setErrorMessages(enlang);
