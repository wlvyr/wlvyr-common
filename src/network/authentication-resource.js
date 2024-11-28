/*---------------------------------------------------------------------------------------------
 *  Copyright (c) wlvyr. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { HttpMethods, Resource } from "./resource.js";

/**
 * Resource class specialized for authentication-related requests.
 * Extends the base Resource class without authorization service.
 */
export class AuthenticationResource extends Resource {
  /**
   * Creates an AuthenticationResource instance.
   * @param {string} baseUrl - The base URL of the API.
   * @param {string} resourcePath - The API path for authentication (e.g., "/auth/login").
   * @param {object} [headers] - Optional headers to include with the request. to add http-only cookie, add "credentials:'include'" or "credentials:'same-origin'"
   */
  constructor(baseUrl, resourcePath, headers) {
    super(baseUrl, resourcePath, undefined, headers);
  }

  /**
   * Authenticates a user by sending credentials (or using cookie-based auth if no credentials provided).
   *
   * @param {object | undefined} [credential] - Optional credentials object to send in the POST body.
   * @param {AbortSignal | undefined} [abortSignal] - Optional signal to abort the request.
   * @returns {Promise<Response>} The fetch response containing the user's authorization details.
   */
  authenticate = async (credential = undefined, abortSignal = undefined) => {
    let post = async () => {
      let response = await fetch(
        this.Url,
        this.constructPayload(
          HttpMethods.POST,
          this.getHeaders(),
          credential,
          abortSignal
        )
      );

      return response;
    };

    return await this._tryAsync(post);
  };
}
