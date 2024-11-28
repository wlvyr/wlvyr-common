/*---------------------------------------------------------------------------------------------
 *  Copyright (c) wlvyr. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AuthenticationResource } from "./authentication-resource.js";
import { AuthorizationType } from "./authorization-type.js";
import { ErrorMessages } from "@/src/error/error-messages.js";

/**
 * Service to manage token-based authorization and automatic token refresh logic.
 */
export class TokenAuthorizationService {
  /** @type {boolean} */
  #isRefreshing = false;

  /** @type {number | undefined} */ // Date.now()
  #lastAuthTime = undefined;

  /** @type {number | undefined} */
  #authExpirationInMs = undefined;

  /** @type {string | undefined} */
  #accessToken = undefined;

  /** @type {Array<any>} */
  #requestQueue = [];

  /**
   * @param {AuthenticationResource} reAuthenticationResource - Resource responsible for re-authenticating, using refresh token, and issuing new access tokens.
   * @param {number} authExpirationInMs - Duration in milliseconds after which the token is considered expired.
   * @throws Will throw if `authExpirationInMs` or `reAuthenticationResource` is not provided.
   */
  constructor(reAuthenticationResource, authExpirationInMs) {
    if (!authExpirationInMs) {
      throw (
        ErrorMessages.Exceptions.ArgumentNullException + ", authValidTimeInMs"
      );
    }

    if (!reAuthenticationResource) {
      throw (
        ErrorMessages.Exceptions.ArgumentNullException +
        ", reAuthenticationResource"
      );
    }

    this.#authExpirationInMs = authExpirationInMs;
    this.authResource = reAuthenticationResource;
  }

  /**
   * Indicates whether a token refresh operation is in progress.
   * @returns {boolean}
   */
  get isAuthenticating() {
    return this.#isRefreshing;
  }

  /**
   * Sets the current access token.
   * @param {string} val - The new access token.
   */
  setAccessToken = (val) => {
    this.#accessToken = val;
  };

  // a more abstract name for isTokenValid
  // valid when there is an access token or when there is an access token and
  // last update is not more than the auth expiration time
  /**
   * Checks whether the current authorization is valid.
   * @returns {boolean} `true` if access token is set and still valid; otherwise, `false`.
   */
  isAuthValid = () => {
    return (
      // !! ensures boolean is the output. without it, the returned value might be undefined.
      !!(
        this.#accessToken &&
        this.#lastAuthTime &&
        // @ts-ignore
        this.#lastAuthTime + this.#authExpirationInMs > Date.now()
      ) || !!(this.#accessToken && !this.#lastAuthTime)
    );
  };

  // vague but might be better if AuthService is going to be abstract
  // for tokens it should be addAuthOn, or constructAuthWith
  /**
   * Adds the Authorization header to the given object using the stored access token.
   * @param {Object<string, any>} obj - Object to which the `Authorization` header will be added.
   * @throws Will throw if `obj` is null or undefined.
   */
  addAuthorizationTo(obj) {
    if (!obj) {
      throw ErrorMessages.Exceptions.ArgumentNullException;
    }

    obj.Authorization = `${AuthorizationType.Bearer} ${this.#accessToken}`;
  }

  /**
   * Wraps a fetch-like operation and handles 401 responses by retrying after re-authentication if needed.
   * @param {function} resourceFetch
   * @returns {Promise<Response>} The final fetch response, possibly retried after authentication.
   *
   * each await fetch of any resource will
   * check for response.status === 401
   * if so, call
   *    if auth still valid, just return 401
   *    if auth is invalid, #authenticate and pause all other requests until auth has been refreshed. after refreshing the auth... retry request.
   * for all other requests that 401 but now with a valid token, just retry request without refreshing the token.
   *
   * isAuthValid() will just check when the last update ocurred. If it's more than token interval (15min) then the token is invalid
   */
  authorizedFetch = async (resourceFetch) => {
    // wait for new token
    // before invoking apicall
    // if already refreshing
    if (this.isAuthenticating) {
      let refreshAuthResponse = await this.#waitForAuthentication();

      // error most likely refresh_token expired.
      if (!refreshAuthResponse.ok) {
        return refreshAuthResponse;
      }
    }

    let response = await resourceFetch();

    // unauthorized error, try refreshing token
    if (response.status === 401 && !this.isAuthValid()) {
      await this.#authenticate();
    }

    // try one last time
    if (response.status === 401 && this.isAuthValid()) {
      response = await resourceFetch();
    }

    return response;
  };

  // a more abstract name for refreshToken
  /**
   * Handles token refresh and resolves/rejects queued fetch requests depending on refresh success.
   * @returns {Promise<Response>} The response from the authentication endpoint.
   */
  #authenticate = async () => {
    this.#isRefreshing = true;

    try {
      let response = await this.authResource.authenticate();

      if (response.ok) {
        /** @type {Object<string, any>} */
        let data = response.json();
        this.#accessToken = data.access_token;
        this.#lastAuthTime = Date.now();
        this.#requestQueue.forEach(({ resolve }) => resolve(response));
      } else {
        this.#requestQueue.forEach(({ reject }) => reject(response));
      }

      // clears the array.
      this.#requestQueue.length = 0;

      return response;
    } catch (error) {
      throw error;
    } finally {
      this.#isRefreshing = false;
    }
  };

  #waitForAuthentication = async () => {
    return new Promise((resolve, reject) => {
      this.#requestQueue.push({ resolve, reject });
    });
  };
}
