import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { HttpMethods, Resource } from "@wlvyr/common/network";
import { ErrorMessages } from "@wlvyr/common/error";

describe("resource", () => {
  let validResource;
  let mockedAuthService;
  let mockedHeaders;

  let mockResourcePath;
  let mockBaseUrl;

  beforeEach(() => {
    mockedAuthService = {
      isAuthValid: jest.fn(),
      addAuthorizationTo: jest.fn(),
      authorizedFetch: jest.fn(),
    };

    mockedHeaders = {};
    mockResourcePath = "/some-path";
    mockBaseUrl = "https-example-url-dot-com";

    validResource = new Resource(
      mockBaseUrl,
      mockResourcePath,
      mockedAuthService,
      mockedHeaders
    );
  });

  describe("constructor", () => {
    it("should throw an Exception when baseUrl or resourcePath is null", () => {
      expect(() => new Resource()).toThrow(
        `${ErrorMessages.Exceptions.ArgumentNullException}, baseUrl`
      );

      expect(() => new Resource("baseUrl", undefined)).toThrow(
        `${ErrorMessages.Exceptions.ArgumentNullException}, resourcePath`
      );
    });
  });

  describe("Url prop", () => {
    it("should return a string of combined baseUrl and resource path", () => {
      let actualResult = validResource.Url;

      expect(actualResult).toBe(`${mockBaseUrl}${mockResourcePath}`);
    });
  });

  describe("getHeaders", () => {
    it("should default accept and content-type headers to json", () => {
      let actualHeaders = new Resource("baseUrl", "resource").getHeaders();

      expect(actualHeaders.Accept).toBe("application/json");
      expect(actualHeaders["Content-Type"]).toBe("application/json");
    });

    it("should use auth service if supplied.", () => {
      validResource.getHeaders();
      expect(mockedAuthService.addAuthorizationTo).toHaveBeenCalledTimes(1);
      expect(
        mockedAuthService.addAuthorizationTo.mock.calls[0][0]
      ).toStrictEqual(validResource.request.headers);
    });
  });

  describe("constructPayload", () => {
    it("should convert body object parameter into json formatted string", () => {
      let body = {
        prop1: 1,
        prop2: [1, 2, 3],
      };

      let actualResult = validResource.constructPayload(
        HttpMethods.GET,
        validResource.getHeaders(),
        body
      );

      expect(actualResult.body).toBe(JSON.stringify(body));
    });

    it("should allow null or undefined body", () => {
      let actualResult = validResource.constructPayload(
        HttpMethods.GET,
        validResource.getHeaders(),
        undefined
      );

      expect(actualResult.body).toBe(undefined);
    });
  });

  describe("arrayToQueryString", () => {
    it("should convert an array to query string format", () => {
      let key = "some-key";
      let items = [1, 2, 3, 4];

      let actualResult = validResource.arrayToQueryString(key, items);

      expect(actualResult).toBe("some-key=1&some-key=2&some-key=3&some-key=4");
    });
  });

  describe("toQueryString", () => {
    it("should output obj argument in correct query string format", () => {
      let obj = {
        prop1: 1,
        prop2: "2",
        prop3: [1, 2],
      };

      let actualResult = validResource.toQueryString(obj);

      expect(actualResult).toBe("prop1=1&prop2=2&prop3=1&prop3=2");
    });
  });

  describe("_tryAsync", () => {
    it("should fetch with authorization when AuthService is valid", async () => {
      let func = jest.fn();

      await validResource._tryAsync(func);

      expect(mockedAuthService.authorizedFetch).toHaveBeenCalledTimes(1);
      expect(mockedAuthService.authorizedFetch.mock.calls[0][0]).toBe(func);
    });

    it("should use standard fetch when AuthService is undefined", async () => {
      let func = jest.fn();

      await new Resource("resource", "url")._tryAsync(func);

      expect(mockedAuthService.authorizedFetch).not.toHaveBeenCalled();
      expect(func).toHaveBeenCalledTimes(1);
    });

    it("should return a NetworkError response with status undefined when NetworkError is in the error message, on thrown exception", async () => {
      let func = jest.fn(() => {
        throw { message: "some text NetworkError some text" };
      });

      let response = await new Resource("resource", "url")._tryAsync(func);

      expect(response.status).toBe(undefined);
      expect(response.message).toBe(ErrorMessages.Network.NetworkError);
    });

    it("should return a BadRequest when not a NetworkError, on thrown exception", async () => {
      let func = jest.fn(() => {
        throw { message: "some text some text" };
      });

      let response = await new Resource("resource", "url")._tryAsync(func);

      expect(response.status).toBe(400);
      expect(response.message).toBe(ErrorMessages.Network.Request.BadRequest);
    });
  });
});
