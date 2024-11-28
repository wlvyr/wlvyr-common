/*---------------------------------------------------------------------------------------------
 *  Copyright (c) wlvyr. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { sanitizefetchException } from "./network.util.js";
import { ErrorMessages } from "@/src/error/error-messages.js";

/**
 * Enum-like object representing standard HTTP methods.
 *
 * @readonly
 * @enum {string}
 */
export const HttpMethods = Object.freeze({
  /** HTTP GET method */
  GET: "GET",
  /** HTTP POST method */
  POST: "POST",
  /** HTTP PUT method */
  PUT: "PUT",
  /** HTTP PATCH method */
  PATCH: "PATCH",
  /** HTTP DELETE method */
  DELETE: "DELETE",

  // /** HTTP OPTIONS method - used by third-party to check resource options */
  // OPTIONS: 'OPTIONS',

  // /** HTTP HEAD method - not implemented */
  // HEAD: 'HEAD',
  // /** HTTP TRACE method - not implemented */
  // TRACE: 'TRACE',
  // /** HTTP CONNECT method - not implemented */
  // CONNECT: 'CONNECT',
});

/**
 * Represents a remote HTTP resource, providing utility methods to build and send HTTP requests.
 */
export class Resource {
  /**
   * Constructs a new `Resource` instance.
   *
   * @param {string} baseUrl - The base URL of the API (e.g., "https://example.com"). 
   * @param {string} resourcePath - The path to the resource (e.g., "/api/users").
   * @param {{ 
   *   authorizedFetch: (resourceFetch: Function) => Promise<any>, 
   *   addAuthorizationTo: (headers: object) => object 
   * }} [authService] - Optional authorization service that adds auth headers and wraps requests.
   * @param {object} [headers] - Optional headers to merge with the default headers.
   * @throws Will throw if `baseUrl` or `resourcePath` is not provided.
   */
  constructor(
    baseUrl,
    resourcePath,
    authService = undefined,
    headers = undefined
  ) {
    if (!baseUrl) {
      throw ErrorMessages.Exceptions.ArgumentNullException + ", baseUrl";
    }

    if (!resourcePath) {
      throw ErrorMessages.Exceptions.ArgumentNullException + ", resourcePath";
    }

    this.request = {
      baseUrl: baseUrl,
      resourcePath: resourcePath,
      resourceUrl: baseUrl + resourcePath,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(headers ?? {}),
      },
    };

    this.authService = authService;
  }

  /**
   * Gets the full URL of the resource.
   *
   * @returns {string} Full resource URL.
   */
  get Url() {
    return this.request.baseUrl + this.request.resourcePath;
  }

  /**
   * Constructs a fetch payload with method, headers, body, and optional abort signal.
   *
   * @param {string} method - HTTP method (e.g., "GET", "POST").
   * @param {object} headers - Headers to include in the request.
   * @param {object} [body] - Request body object.
   * @param {AbortSignal | undefined} [abortSignal] - Optional signal to abort the request.
   * @returns {object} Fetch payload.
   */
  constructPayload = (method, headers, body, abortSignal = undefined) => {
    return {
      method: method,
      headers: headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: abortSignal,
    };
  };

  /**
   * Gets headers for a request, including any authorization headers if `authService` is defined.
   *
   * @returns {object} Headers object.
   */
  getHeaders = () => {
    return (
      this.authService?.addAuthorizationTo({ ...this.request.headers }) ??
      this.request.headers
    );
  };

  // could probably turn this function into a utility method (without the 401 part)
  // mostly for generally handling fetch exceptions
  /**
   * Safely executes an async API call, optionally using `authService` and sanitizing fetch exceptions.
   *
   * @param {Function} apiCallFuncAsync - An async function performing a fetch request.
   * @returns {Promise<any>} Result of the API call or sanitized error.
   */
  _tryAsync = async (apiCallFuncAsync) => {
    try {
      if (this.authService) {
        return await this.authService.authorizedFetch(apiCallFuncAsync);
      } else {
        return await apiCallFuncAsync();
      }
    } catch (error) {
      return sanitizefetchException(error);
    }
  };

  /**
   * Converts an object into a URL-encoded query string.
   *
   * @param {any} obj - Object to convert to a query string.
   * @returns {string} URL query string.
   * @throws Will throw if the input is an array.
   */
  toQueryString = (obj) => {
    if (Array.isArray(obj)) {
      throw ErrorMessages.Network.Request.QueryObjInvalid;
    }

    var queryString = Object.keys(obj)
      .map((key) => {
        if (Array.isArray(obj[key])) {
          return this.arrayToQueryString(key, obj[key]);
        }

        return key + "=" + obj[key];
      })
      .join("&");

    return queryString;
  };

  /**
   * Converts an array into a query string format for repeated keys.
   *
   * @param {string} key - Query parameter key.
   * @param {Array<any>} arr - Array of values for the key.
   * @returns {string} URL query string fragment.
   */
  arrayToQueryString = (key, arr) => {
    return arr.map((item) => key + "=" + item).join("&");
  };
}
