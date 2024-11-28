import { jest, describe, it, expect, afterEach } from "@jest/globals";
import { timeout, sanitizefetchException } from "@wlvyr/common/network";
import { ErrorMessages } from "@wlvyr/common/error";

describe("network.util", () => {
  describe("timeout", () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it("should invoke abort on supplied timeout", () => {
      let abortController = {
        abort: jest.fn(),
      };
      let timeoutinMS = 1000;
      jest.useFakeTimers();

      timeout(abortController, timeoutinMS);

      expect(abortController.abort).not.toHaveBeenCalled();

      jest.advanceTimersByTime(timeoutinMS);

      expect(abortController.abort).toHaveBeenCalledTimes(1);
    });

    it("should timeout at the exact timeout supplied", (done) => {
      jest.useFakeTimers();

      let timeoutinMS = 1000;
      let abortController = {
        abort: () => {
          // get time in ms
          let afterDate = Date.now();
          let timeElapsed = afterDate - beforeDate;

          // assert timeElapsed is close to 1000
          expect(timeElapsed).toBe(timeoutinMS);

          done();
        },
      };
      let beforeDate = Date.now();

      timeout(abortController, timeoutinMS);

      jest.advanceTimersByTime(timeoutinMS);
    });

    it("should throw an error when argument is null", () => {
      let abortController = undefined;
      let timeInMs = undefined;

      // abortController null
      expect(() => timeout(abortController, timeInMs)).toThrow(
        `abortController ${ErrorMessages.Exceptions.ValueNotvalid}`
      );

      // abortController no abort method
      abortController = {};
      expect(() => timeout(abortController, timeInMs)).toThrow(
        `abortController ${ErrorMessages.Exceptions.ValueNotvalid}`
      );

      // timeInMs null
      abortController = { abort: () => {} };
      expect(() => timeout(abortController, timeInMs)).toThrow(
        `timeinMs ${ErrorMessages.Exceptions.ValueNotvalid}`
      );
    });
  });

  describe("sanitizefetchException", () => {
    it("should return a NetworkError response with status undefined when NetworkError is in the message", () => {
      let error = { message: "NetworkError" };
      let response = sanitizefetchException(error);

      expect(response.status).toBe(undefined);
      expect(response.message).toBe(ErrorMessages.Network.NetworkError);
      expect(response.ok).toBe(false);
      expect(response.aborted).toBe(false);
    });

    it("should return a BadRequest when not a NetworkError", () => {
      let error = { message: "Some other error" };
      let response = sanitizefetchException(error);

      expect(response.status).toBe(400);
      expect(response.message).toBe(ErrorMessages.Network.Request.BadRequest);
      expect(response.ok).toBe(false);
      expect(response.aborted).toBe(false);
    });

    it("should return an Aborted when not a NetworkError", () => {
      let error = { message: "AbortError Some other error" };
      let response = sanitizefetchException(error);

      expect(response.status).toBe(undefined);
      expect(response.message).toBe(ErrorMessages.Network.Request.Aborted);
      expect(response.ok).toBe(false);
      expect(response.aborted).toBe(true);
    });
  });
});
