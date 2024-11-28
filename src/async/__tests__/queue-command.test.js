import { jest, describe, it, expect, afterEach } from "@jest/globals";
import { QueueCommand, QueueInfo, QueueStatus } from "@wlvyr/common/async";
import { UserCommand } from "@wlvyr/common";
import { ErrorMessages } from "@wlvyr/common/error";

describe("QueueCommand", () => {
  it("should throws if userCommand is undefined", () => {

    // @ts-ignore
    expect(() => new QueueCommand(undefined)).toThrow(
      `${ErrorMessages.Exceptions.ArgumentUndefinedException}, "userCommand"`
    );
  });

  it("should sets command and queueInfo correctly", () => {
    const userCommand = new UserCommand("TEST_COMMAND");
    const queueCommand = new QueueCommand(userCommand);

    expect(queueCommand.command).toBe(userCommand);
    expect(queueCommand.queueInfo).toBeInstanceOf(QueueInfo);
  });

  describe("onStatusUpdate", () => {
    test("listener should be invoked when onStatusUpdate", () => {
      const userCommand = new UserCommand("TEST_COMMAND");
      const queueCommand = new QueueCommand(userCommand);

      const mockedListener = jest.fn();
      const secondMockedListener = jest.fn();

      const expectedStatus = QueueStatus.Complete;

      queueCommand.addOnStatusUpdate(mockedListener);
      queueCommand.addOnStatusUpdate(secondMockedListener);
      queueCommand.onStatusUpdate(expectedStatus);

      const actualStatus = mockedListener.mock.calls[0][0];
      expect(mockedListener).toHaveBeenCalled();
      expect(actualStatus).toBe(expectedStatus)

      expect(secondMockedListener).toHaveBeenCalled();
    });

    test("removed listener should not be called onStatusUpdate", () => {
      const userCommand = new UserCommand("TEST_COMMAND");
      const queueCommand = new QueueCommand(userCommand);

      const mockedListener = jest.fn();
      queueCommand.addOnStatusUpdate(mockedListener);
      queueCommand.onStatusUpdate(QueueStatus.Complete);
      expect(mockedListener).toHaveBeenCalled();

      mockedListener.mockClear();

      queueCommand.removeOnStatusUpdate(mockedListener);
      queueCommand.onStatusUpdate(QueueStatus.Complete);
      expect(mockedListener).not.toHaveBeenCalled();
    });
  });

  describe("completed", () => {
    test("invoking completed will resolve onCompleted promise", async () => {
      const userCommand = new UserCommand("TEST_COMMAND");
      const queueCommand = new QueueCommand(userCommand);

      const expectedCompletedStatus = false;
      const expectedResolve = (success) => {
        expect(success).toBe(expectedCompletedStatus);
      };

      const promise = queueCommand.onComplete();
      expect(promise).toBeInstanceOf(Promise);
      
      promise.then(expectedResolve);
      queueCommand.completed(expectedCompletedStatus);

      // succeeding promise will immediately resolve
      const newPromise = queueCommand.onComplete();
      newPromise.then(expectedCompletedStatus);
    });
  });
});