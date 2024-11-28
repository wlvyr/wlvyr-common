import { jest, describe, it, expect, afterEach } from "@jest/globals";
import { UserCommand, UserCommandMeta } from "@wlvyr/common";

describe("UserCommand", () => {
  it("should construct with default payload and meta", () => {
    const command = new UserCommand("TestType");

    expect(command.type).toBe("TestType");
    expect(command.payload).toEqual({});
    expect(command.meta).toBeInstanceOf(UserCommandMeta);
    expect(command.meta.resourceId).toBe("system");
  });

  it("should assign payload and meta correctly", () => {
    const meta = new UserCommandMeta("res-id", "ctx-id");
    const payload = { key: "value" };
    const cmd = new UserCommand("TEST", payload, meta);

    const cmd2ExpectedMeta = {
      resourceId: "some-resource-id",
      contextId: "some-context-id",
      isPatch: true,
    };
    const cmd2 = new UserCommand("TEST-2", payload, cmd2ExpectedMeta);

    expect(cmd.payload).toBe(payload);
    expect(cmd.meta).toBe(meta);

    expect(cmd2.meta.resourceId).toBe(cmd2ExpectedMeta.resourceId);
    expect(cmd2.meta.contextId).toBe(cmd2ExpectedMeta.contextId);
    expect(cmd2.meta.isPatch).toBe(cmd2ExpectedMeta.isPatch);
  });

  describe("executed", () => {
    test("invoking executed will resolve onExecute promise", async () => {
      const userCommand = new UserCommand("TEST_COMMAND");

      const expectedExecutedStatus = false;

      const promise = userCommand.onExecute();
      expect(promise).toBeInstanceOf(Promise);

      const expectedResolve = (success) => {
        expect(success).toBe(expectedExecutedStatus);
      };
      promise.then(expectedResolve);

      userCommand.executed(expectedExecutedStatus);

      // succeeding promise will immediately resolve
      const newPromise = userCommand.onExecute();
      newPromise.then(expectedResolve);
    });
  });
});
