import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";

import { HttpMethods, AuthenticationResource } from "@wlvyr/common/network";

describe("rest resource", () => {
  let originalFetch = global.fetch;

  let restResource;
  let defaultHeaders;

  beforeEach(() => {
    restResource = new AuthenticationResource("url", "/resource", { credentials:"include" });

    defaultHeaders = {
      Accept: "application/json",
      "Content-Type": "application/json",
      credentials: "include"
    };

    global.fetch = jest.fn().mockReturnValue({});
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("authenticate", () => {
    it("should use correct http method and headers", async () => {
      await restResource.authenticate({});

      let actualUrl = global.fetch.mock.calls[0][0];
      let actualPayload = global.fetch.mock.calls[0][1];

      expect(actualUrl).toBe(restResource.Url);
      expect(actualPayload.method).toBe(HttpMethods.POST);
      expect(actualPayload.headers).toStrictEqual(defaultHeaders);
    });

    it("should pass on abort signal to the fetch method", async () => {
      let signal = {};

      await restResource.authenticate({}, signal);
      let actualPayload = global.fetch.mock.calls[0][1];
      expect(actualPayload.signal).toBe(signal);
    });
  });
});
