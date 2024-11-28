import { jest, describe, it, expect, afterEach } from "@jest/globals";
import { UserCommandMeta } from "@wlvyr/common";

describe("UserCommandMeta", () => {
  it("should construct with resourceId, contextId, and the default properties", () => {
    const meta = new UserCommandMeta("resource1", "context1");

    expect(meta.resourceId).toBe("resource1");
    expect(meta.contextId).toBe("context1");
    expect(meta.uuid).toBeTruthy();
    expect(new Date(meta.timestamp).getTime()).not.toBeNaN();
    expect(meta.isPatch).toBe(false);
    expect(meta.isSensitiveData).toBe(false);

  });

  test("resourceId and contextId should default to undefined", () => {
    const meta = new UserCommandMeta();
    expect(meta.contextId).toBeUndefined();
    expect(meta.resourceId).toBeUndefined();
  });

  it("should compute ReferenceId with contextId correctly", () => {
    const meta = new UserCommandMeta("resource1", "context1");
    const referenceId = meta.ReferenceId;

    expect(referenceId).toMatch(/^context1resource1[0-9a-fA-F-]{36}$/);
  });

  it("should compute ReferenceId without contextId correctly", () => {
    const meta = new UserCommandMeta("resource1");
    const referenceId = meta.ReferenceId;

    expect(referenceId).toMatch(/^resource1[0-9a-fA-F-]{36}$/);
  });

  it("should compute ReferenceId without resourceId correctly", () => {
    const meta = new UserCommandMeta(undefined, "context1");
    const referenceId = meta.ReferenceId;

    expect(referenceId).toMatch(/^context1[0-9a-fA-F-]{36}$/);
  });
});
