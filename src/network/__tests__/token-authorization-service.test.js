import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { ErrorMessages } from "@wlvyr/common/error";
import {
  AuthorizationType,
  TokenAuthorizationService,
} from "@wlvyr/common/network";

describe("TokenAuthService", () => {
  describe("constructor", () => {
    it("should throw an exception if either of the arguments is undefined", () => {
      let authExpirationInMs;
      let authResource;

      expect(
        () => new TokenAuthorizationService(authResource, authExpirationInMs)
      ).toThrow(
        `${ErrorMessages.Exceptions.ArgumentNullException}, authValidTimeInMs`
      );

      authExpirationInMs = 1;
      expect(
        () => new TokenAuthorizationService(authResource, authExpirationInMs)
      ).toThrow(
        `${ErrorMessages.Exceptions.ArgumentNullException}, reAuthenticationResource`
      );

      authResource = {};
      expect(
        () => new TokenAuthorizationService(authResource, authExpirationInMs)
      ).not.toThrow();
    });
  });

  describe("isAuthValid", () => {
    it("should be valid when token is set", () => {
      let authRes = {};
      let expTime = 1;
      let authService = new TokenAuthorizationService(authRes, expTime);

      expect(authService.isAuthValid()).toBe(false);

      authService.setAccessToken("sometoken");

      expect(authService.isAuthValid()).toBe(true);
    });
  });

  describe("addAuthorizationTo", () => {
    it("should add Authorization header to provided obj", () => {
      let authRes = {};
      let expTime = 1;
      let authService = new TokenAuthorizationService(authRes, expTime);

      let token = "some-token";
      authService.setAccessToken(token);

      let someObj = {};
      authService.addAuthorizationTo(someObj);
      expect(someObj).toStrictEqual({
        Authorization: `${AuthorizationType.Bearer} ${token}`,
      });
    });

    it("should throw an ArgumentNullException when obj is undefined", () => {
      let authRes = {};
      let expTime = 1;
      let authService = new TokenAuthorizationService(authRes, expTime);

      expect(() => authService.addAuthorizationTo(undefined)).toThrow(
        ErrorMessages.Exceptions.ArgumentNullException
      );
    });
  });

  describe("authorizedFetch", () => {
    let mockedResourceFetch;
    let mockedAuthRes;
    let expTime = 10000;
    let authService;

    beforeEach(() => {
      mockedResourceFetch = jest.fn();
      mockedAuthRes = { authenticate: jest.fn() };
      authService = new TokenAuthorizationService(mockedAuthRes, expTime);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should return the requested response when authorization is valid", async () => {
      let expectedResponse = {
        ok: true,
        status: 200,
        data: { a: 1, b: 2 },
      };

      mockedResourceFetch.mockReturnValue(expectedResponse);

      let actualResult = await authService.authorizedFetch(mockedResourceFetch);

      expect(actualResult).toBe(expectedResponse);
    });

    it("should re-authenticate once when access token is invalid", async () => {
      jest.useFakeTimers();

      mockedAuthRes.authenticate.mockReturnValue({
        status: 200,
        ok: true,
        json: jest.fn().mockReturnValue({
          access_token: "asdf",
        }),
      });

      mockedResourceFetch.mockReturnValue({ status: 401 });

      await authService.authorizedFetch(mockedResourceFetch);

      expect(mockedAuthRes.authenticate).toHaveBeenCalledTimes(1);
      expect(mockedResourceFetch).toHaveBeenCalledTimes(2);
    });

    it("should wait for re-authentication when token is invalid", async () => {
      jest.useFakeTimers();

      let timeoutMs = 1000;

      mockedAuthRes.authenticate.mockImplementation(
        () =>
          new Promise((resolve) => {
            let returnedItem = {
              status: 200,
              ok: true,
              json: jest.fn().mockReturnValue({
                access_token: "asdf",
              }),
            };

            setTimeout(() => resolve(returnedItem), timeoutMs);
          })
      );

      mockedResourceFetch.mockReturnValue({ status: 401 });

      let mockedSecondFetch = jest.fn().mockReturnValue({ status: 200 });
      let mockedThirdFetch = jest.fn().mockReturnValue({ status: 200 });

      authService.authorizedFetch(mockedResourceFetch);
      expect(authService.isAuthenticating).toBe(false);

      // convoluted way to test requests to queue while
      // token is being refreshed.
      //
      // mockedSecondFetch just ensures mockedResourceFetch
      // has enough time to be in the state of authenticating
      // it should be `await new Promise((resolve) => setTimeout(resolve, 10));`
      // but the timeout hangs.
      //
      await authService.authorizedFetch(mockedSecondFetch);
      expect(authService.isAuthenticating).toBe(true);

      // mockedThirdFetch is the only fetch that is enqueued
      let p3 = authService.authorizedFetch(mockedThirdFetch);

      // this one is important as this fulfills the
      // await mockedAuthRes.authenticate.
      jest.advanceTimersByTime(timeoutMs);

      // await p3 to ensure p3 finishes.
      // if test timeout occurs, this might be the cause.
      await p3;

      expect(mockedAuthRes.authenticate).toHaveBeenCalledTimes(1);
      expect(mockedResourceFetch).toHaveBeenCalledTimes(2);

      expect(mockedSecondFetch).toHaveBeenCalledTimes(1);
      expect(mockedThirdFetch).toHaveBeenCalledTimes(1);
    });
  });
});
