/*---------------------------------------------------------------------------------------------
 *  Copyright (c) wlvyr. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Enum-like object representing supported authorization types.
 * Currently, only the 'Bearer' type is supported.
 * 
 * @readonly
 * @enum {string}
 */
export const AuthorizationType = Object.freeze({

  /** Bearer token authorization (e.g., "Authorization: Bearer <token>") */
  Bearer: "Bearer",


  // the following are currently unsupported
  // /** Basic authentication (e.g., "Authorization: Basic <base64(username:password)>") */
  // Basic: "Basic",
  // /** Digest authentication (rarely used) */
  // Digest: "Digest",
  // /** OAuth 1.0 authentication */
  // OAuth1: "OAuth",
});
