/*---------------------------------------------------------------------------------------------
 *  Copyright (c) wlvyr. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ErrorMessages } from "@/src/error/error-messages.js";

/**
 * Aborts the provided AbortController after the specified timeout period.
 *
 * @param {AbortController} abortController - An instance of AbortController to be aborted after timeout.
 * @param {number} timeinMs - Timeout duration in milliseconds after which the request will be aborted.
 * @throws Will throw an error if abortController is invalid or timeinMs is not provided.
 */
export function timeout(abortController, timeinMs) {
  if (!abortController || !("abort" in abortController)) {
    throw `abortController ${ErrorMessages.Exceptions.ValueNotvalid}`;
  }

  if (!timeinMs) {
    throw `timeinMs ${ErrorMessages.Exceptions.ValueNotvalid}`;
  }

  setTimeout(() => abortController.abort(), timeinMs);
}

/**
 * Sanitizes fetch-related exceptions to return a normalized error response object.
 *
 * @param {any} error - The caught error from a failed fetch request.
 * @param {string} [requestName] - The name of the request (optional, currently unused but reserved for logging).
 * @returns {{
 *   status: number | undefined,
 *   message: string,
 *   aborted: boolean,
 *   ok: boolean
 * }} A standardized error object with details about the failure.
 *
 * NetworkError:
 *   - Typically occurs when offline, DNS resolution fails, or the server is unreachable.
 *
 * AbortError:
 *   - Thrown when the fetch is aborted by AbortController.
 *
 * Other Errors:
 *   - Most likely due to misconfiguration (e.g. invalid URL, CORS issue).
 */
export function sanitizefetchException(error, requestName = undefined) {
  // caught error here are either network issue
  // - user is offline, dns resolution failure, server unreachable
  // or incorrect configuration
  // - invalid url, cors origin error

  if (error.message?.includes("NetworkError", 0)) {
    return {
      status: undefined,
      message: ErrorMessages.Network.NetworkError,
      aborted: false,
      ok: false,
    };
  } else if (error.message?.includes("AbortError", 0)) {
    return {
      status: undefined,
      message: ErrorMessages.Network.Request.Aborted,
      aborted: true,
      ok: false,
    };
  } else {
    // for incorrect configuration
    // log error by sending the error to the server.
    // inform user action cannot be done for the mean time. Contact support if it persists.

    // code, action to log error.

    return {
      status: 400,
      message: ErrorMessages.Network.Request.BadRequest,
      aborted: false,
      ok: false,
    };
  }
}
