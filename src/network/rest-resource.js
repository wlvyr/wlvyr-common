/*---------------------------------------------------------------------------------------------
 *  Copyright (c) wlvyr. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { HttpMethods, Resource } from "./resource.js";

/**
 * A RESTful resource abstraction that extends the base `Resource` class.
 * Provides convenience methods for common HTTP operations: GET, POST, PUT, and query by GET/POST.
 */
export class RestResource extends Resource {
  /**
   * Constructs a new `RestResource` instance.
   *
   * @param {string} baseUrl - The base URL of the API (e.g., "https://example.com").
   * @param {string} resourcePath - The path to the resource (e.g., "/api/users").
   * @param {{
   *   authorizedFetch: (resourceFetch: Function) => Promise<any>,
   *   addAuthorizationTo: (headers: object) => object
   * }} [authService] - Optional authorization service that adds auth headers and wraps requests.
   * @param {object} [headers] - Optional headers to merge with the default headers.
   */
  constructor(
    baseUrl,
    resourcePath,
    authService = undefined,
    headers = undefined
  ) {
    super(baseUrl, resourcePath, authService, headers);
  }

  /**
   * Sends a GET request to the resource, optionally with an ID.
   *
   * @param {string | number} [id] - Optional resource identifier.
   * @param {AbortSignal} [abortSignal] - Optional signal to abort the request.
   * @returns {Promise<Response>} The fetch response.
   */
  get = async (id = undefined, abortSignal = undefined) => {
    let get = async () => {
      let response = await fetch(
        `${this.Url}${id ? `/${id}` : ""}`,
        this.constructPayload(
          HttpMethods.GET,
          this.getHeaders(),
          undefined,
          abortSignal
        )
      );

      return response;
    };

    return await this._tryAsync(get);
  };

  /**
   * Sends a POST request with a payload to the resource.
   *
   * @param {object} obj - The payload to send in the POST request.
   * @param {AbortSignal} [abortSignal] - Optional signal to abort the request.
   * @returns {Promise<Response>} The fetch response.
   */
  post = async (obj, abortSignal = undefined) => {
    let post = async () => {
      let response = await fetch(
        this.Url,
        this.constructPayload(
          HttpMethods.POST,
          this.getHeaders(),
          obj,
          abortSignal
        )
      );

      return response;
    };

    return await this._tryAsync(post);
  };

  /**
   * Sends a PUT request with a payload to update the resource with the given ID.
   *
   * @param {string | number} id - The identifier of the resource to update.
   * @param {object} obj - The payload to send in the PUT request.
   * @param {AbortSignal} [abortSignal] - Optional signal to abort the request.
   * @returns {Promise<Response>} The fetch response.
   */
  put = async (id, obj, abortSignal = undefined) => {
    let put = async () => {
      let response = await fetch(
        `${this.Url}/${id}`,
        this.constructPayload(
          HttpMethods.PUT,
          this.getHeaders(),
          obj,
          abortSignal
        )
      );

      return response;
    };

    return await this._tryAsync(put);
  };

  /**
   * Sends a POST request with a query object to filter results.
   *
   * @param {object} criteria - The query criteria to include in the POST body.
   * @param {AbortSignal} [abortSignal] - Optional signal to abort the request.
   * @returns {Promise<Response>} The fetch response.
   */
  queryByPost = async (criteria, abortSignal = undefined) => {
    let query = async () => {
      let response = await fetch(
        this.Url,
        this.constructPayload(
          HttpMethods.POST,
          this.getHeaders(),
          criteria,
          abortSignal
        )
      );

      return response;
    };

    return await this._tryAsync(query);
  };

  /**
   * Sends a GET request with query parameters to filter results.
   *
   * @param {object} criteria - The query parameters to include in the URL.
   * @param {AbortSignal} [abortSignal] - Optional signal to abort the request.
   * @returns {Promise<Response>} The fetch response.
   */
  queryByGet = async (criteria, abortSignal = undefined) => {
    let query = async () => {
      let response = await fetch(
        `${this.Url}?${this.toQueryString(criteria)}`,
        this.constructPayload(
          HttpMethods.GET,
          this.getHeaders(),
          undefined,
          abortSignal
        )
      );

      return response;
    };

    return await this._tryAsync(query);
  };
}
