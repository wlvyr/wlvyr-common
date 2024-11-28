import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { HttpMethods, RestResource } from "@wlvyr/common/network";

describe("rest resource", () => {
  let originalFetch = global.fetch;

  let restResource;
  let defaultHeaders;

  beforeEach(() => {
    restResource = new RestResource("url", "/resource");

    defaultHeaders = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    global.fetch = jest.fn().mockReturnValue({});
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("get", () => {
    it("should use correct http method and headers", async () => {
      await restResource.get();

      let actualUrl = global.fetch.mock.calls[0][0];
      let actualPayload = global.fetch.mock.calls[0][1];

      expect(actualUrl).toBe(restResource.Url);
      expect(actualPayload.method).toBe(HttpMethods.GET);
      expect(actualPayload.headers).toStrictEqual(defaultHeaders);
    });

    it("should include id parameter in url when provided", async () => {
      let id = 1;

      await restResource.get(id);

      let actualUrl = global.fetch.mock.calls[0][0];
      let actualPayload = global.fetch.mock.calls[0][1];

      expect(actualUrl).toBe(`${restResource.Url}/${id}`);
      expect(actualPayload.method).toBe(HttpMethods.GET);
    });

    it("should pass on abort signal to the fetch method", async () => {
      let signal = {};

      await restResource.get(undefined, signal);
      let actualPayload = global.fetch.mock.calls[0][1];
      expect(actualPayload.signal).toBe(signal);
    });
  });

  describe("post", () => {
    it("should use correct http method and headers", async () => {
      await restResource.post({});

      let actualUrl = global.fetch.mock.calls[0][0];
      let actualPayload = global.fetch.mock.calls[0][1];

      expect(actualUrl).toBe(restResource.Url);
      expect(actualPayload.method).toBe(HttpMethods.POST);
      expect(actualPayload.headers).toStrictEqual(defaultHeaders);
    });

    it("should pass on abort signal to the fetch method", async () => {
      let signal = {};

      await restResource.post({}, signal);
      let actualPayload = global.fetch.mock.calls[0][1];
      expect(actualPayload.signal).toBe(signal);
    });
  });
  describe("put", () => {
    it("should use correct http method and headers", async () => {
      let id = 1;

      await restResource.put(id, {});

      let actualUrl = global.fetch.mock.calls[0][0];
      let actualPayload = global.fetch.mock.calls[0][1];

      expect(actualUrl).toBe(`${restResource.Url}/${id}`);
      expect(actualPayload.method).toBe(HttpMethods.PUT);
      expect(actualPayload.headers).toStrictEqual(defaultHeaders);
    });

    it("should pass on abort signal to the fetch method", async () => {
      let signal = {};

      await restResource.put(1, {}, signal);

      let actualPayload = global.fetch.mock.calls[0][1];

      expect(actualPayload.signal).toBe(signal);
    });
  });
  describe("queryByGet", () => {
    it("should use correct http method and headers", async () => {
      let criteria = { a: 1, b: 2 };
      await restResource.queryByGet(criteria);

      let actualUrl = global.fetch.mock.calls[0][0];
      let actualPayload = global.fetch.mock.calls[0][1];

      expect(actualUrl).toBe(`${restResource.Url}?a=1&b=2`);
      expect(actualPayload.method).toBe(HttpMethods.GET);
      expect(actualPayload.headers).toStrictEqual(defaultHeaders);
    });
    it("should pass on abort signal to the fetch method", async () => {
      let signal = {};

      await restResource.queryByGet({}, signal);

      let actualPayload = global.fetch.mock.calls[0][1];

      expect(actualPayload.signal).toBe(signal);
    });
  });
  describe("queryByPost", () => {
    it("should use correct http method and headers", async () => {
      let criteria = { a: 1, b: 2 };

      await restResource.queryByPost(criteria);

      let actualPayload = global.fetch.mock.calls[0][1];

      expect(actualPayload.method).toBe(HttpMethods.POST);
      expect(actualPayload.headers).toStrictEqual(defaultHeaders);
      expect(actualPayload.body).toStrictEqual(JSON.stringify(criteria));
    });
    it("should pass on abort signal to the fetch method", async () => {
      let signal = {};

      await restResource.queryByPost({}, signal);

      let actualPayload = global.fetch.mock.calls[0][1];

      expect(actualPayload.signal).toBe(signal);
    });
  });
});
