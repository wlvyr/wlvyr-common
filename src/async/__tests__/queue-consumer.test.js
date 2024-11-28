import { QueueConsumer, QueueCommand, QueueStatus } from "@wlvyr/common/async";

describe("QueueConsumer", () => {
  let consumeFunc;

  /** @type {QueueConsumer} */
  let consumer;

  beforeEach(() => {
    jest.useFakeTimers();

    consumeFunc = jest.fn();
    consumer = new QueueConsumer(consumeFunc);
  });

  afterEach(() => {
    // jest.runOnlyPendingTimers();  // This method executes only the timers that are currently scheduled and then stops. It's perfect for Promise-based async code like your queue consumer because

    jest.useRealTimers();

    if (consumer) {
      consumer.stop();
    }
  });

  describe("constructor", () => {
    test("should throw error when consumeFunc is not provided", () => {
      expect(() => new QueueConsumer(null)).toThrow();
      expect(() => new QueueConsumer(undefined)).toThrow();
    });

    test("should initialize with default values", () => {
      consumer = new QueueConsumer(consumeFunc);

      expect(consumer.consumeFunc).toBe(consumeFunc);
      expect(consumer.consumeConditions).toEqual([]);
      expect(consumer.retryPolicyEvaluator).toBeUndefined();
      expect(consumer.isRunning).toBe(false);
      expect(consumer.queueState).toEqual({ processCount: 0 });
      expect(consumer.queue.size).toBe(0);
    });
  });

  describe("enqueue", () => {
    test("should throw error when command is undefined", () => {
      const invalidQueueCommand = { queueInfo: {} };
      expect(() => consumer.enqueue(invalidQueueCommand)).toThrow();
    });

    test("should throw error when queueInfo is undefined", () => {
      const invalidQueueCommand = { command: {} };
      expect(() => consumer.enqueue(invalidQueueCommand)).toThrow();
    });

    test("should add valid command to queue", () => {
      const queueCommand = createMockQueueCommand();
      consumer.enqueue(queueCommand);

      expect(consumer.queue.has(queueCommand)).toBe(true);
      expect(consumer.queue.size).toBe(1);
    });
  });

  describe("completedCommandExecution", () => {
    test("completedCommandExecution sets status to Complete on success", () => {
      const queueCommand = new QueueCommand({ id: 1 });
      queueCommand.queueInfo = { status: null };
      queueCommand.completed = jest.fn();
      consumer.queueState.processCount = 1; // Simulate command being processed

      consumer.completedCommandExecution(queueCommand, true);

      expect(queueCommand.queueInfo.status).toBe(QueueStatus.Complete);
      expect(queueCommand.completed).toHaveBeenCalledWith(true);
      expect(consumer.queueState.processCount).toBe(0);
    });

    test("completedCommandExecution retries on failure", () => {
      const queueCommand = new QueueCommand({ id: 1 });
      queueCommand.queueInfo = { attemptNo: 0, status: null };
      queueCommand.completed = jest.fn();
      consumer.retryPolicyEvaluator = {
        shouldRetry: jest.fn().mockReturnValue(true),
      };
      consumer.enqueue = jest.fn();

      consumer.completedCommandExecution(queueCommand, false);

      // If retry policy says yes, the command should be re-enqueued
      expect(consumer.enqueue).toHaveBeenCalledWith(queueCommand);
      expect(queueCommand.queueInfo.status).not.toBe("Complete"); // Not marked complete yet
      expect(queueCommand.completed).not.toHaveBeenCalled();

      expect(consumer.retryPolicyEvaluator.shouldRetry).toHaveBeenCalled();
      expect(queueCommand.queueInfo.attemptNo).toBe(1);
    });
  });

  describe("start and stop", () => {
    test("should set isRunning to true when started", () => {
      expect(consumer.isRunning).toBe(false);
      consumer.start();
      expect(consumer.isRunning).toBe(true);
    });

    test("should set isRunning to false when stopped", () => {
      consumer.start();
      expect(consumer.isRunning).toBe(true);

      consumer.stop();
      expect(consumer.isRunning).toBe(false);
    });

    test("should not start consumption twice", async () => {
      const mockCommand = createMockQueueCommand();
      consumer.enqueue(mockCommand);

      consumer.start();
      consumer.start(); // Second start call

      await jest.runOnlyPendingTimersAsync();

      // Should only be called once
      expect(consumeFunc).toHaveBeenCalledTimes(1);
    });
  });

  describe("remove", () => {
    test("should remove command from queue", () => {
      const mockCommand = createMockQueueCommand();
      consumer.enqueue(mockCommand);

      expect(consumer.queue.has(mockCommand)).toBe(true);

      consumer.remove(mockCommand);

      expect(consumer.queue.has(mockCommand)).toBe(false);
    });
  });

  describe("waiting behavior", () => {
    test("should not process when consume conditions are not met", async () => {
      const failingCondition = () => false;
      consumer = new QueueConsumer(consumeFunc, [failingCondition]);

      const mockCommand = createMockQueueCommand();
      consumer.enqueue(mockCommand);
      consumer.start();

      // Let the consumer try to process
      await jest.runOnlyPendingTimersAsync();

      expect(consumeFunc.resumeResolver).toBeUndefined();
      expect(consumeFunc).not.toHaveBeenCalled();
      expect(mockCommand.queueInfo.status).toBe(QueueStatus.Initial);
    });

    test("should not process when queue is empty", async () => {
      consumer = new QueueConsumer(consumeFunc);
      consumer.start();

      // Let the consumer try to process
      await jest.runOnlyPendingTimersAsync();

      expect(consumeFunc).not.toHaveBeenCalled();
    });

    test("should process when conditions become satisfied", async () => {
      let conditionMet = false;
      const condition = () => conditionMet;
      consumer = new QueueConsumer(consumeFunc, [condition]);

      const mockCommand = createMockQueueCommand();
      consumer.enqueue(mockCommand);
      consumer.start();

      // Initially should not process
      await jest.runOnlyPendingTimersAsync();
      expect(consumeFunc).not.toHaveBeenCalled();

      // Now satisfy condition and notify consumer
      conditionMet = true;
      consumer.consumeConditionStateUpdatedEvtListenerAction();

      // Allow processing to occur
      await jest.runOnlyPendingTimersAsync();
      expect(consumeFunc).toHaveBeenCalledWith(mockCommand.command);
      expect(mockCommand.queueInfo.status).toBe(QueueStatus.Processing);
    });

    test("should process multiple commands when conditions are met", async () => {
      consumer = new QueueConsumer(consumeFunc);

      const command1 = createMockQueueCommand({
        command: {
          id: "cmd1",
          onExecute: mockUnResolvedPromise(),
        },
      });
      const command2 = createMockQueueCommand({
        command: {
          id: "cmd2",
          onExecute: mockUnResolvedPromise(),
        },
      });

      consumer.enqueue(command1);
      consumer.enqueue(command2);
      consumer.start();

      // Process first command
      await jest.runOnlyPendingTimersAsync();
      expect(consumeFunc).toHaveBeenCalledWith(command1.command);

      // Complete first command not needed to allow second to process
      //consumer.completedCommandExecution(command1, true);
      await jest.runOnlyPendingTimersAsync();

      expect(consumeFunc).toHaveBeenCalledWith(command2.command);
    });
  });

  describe("command processing", () => {
    test("should update command status to Processing when processing starts", async () => {
      const mockCommand = createMockQueueCommand();
      consumer.enqueue(mockCommand);
      consumer.start();

      await jest.runOnlyPendingTimersAsync();

      expect(mockCommand.queueInfo.status).toBe(QueueStatus.Processing);
      expect(mockCommand.onStatusUpdate).toHaveBeenCalledWith(
        QueueStatus.Processing
      );
      expect(consumer.queueState.processCount).toBe(1);
    });

    test("should attach userCommand.onExecute promise to invoke completedCommandExecution on resolve", async () => {
      const completedCommandExecutionSpy = jest.spyOn(
        consumer,
        "completedCommandExecution"
      );

      let _resolve;
      let promise = new Promise((resolve) => {
        _resolve = resolve;
      });

      const mockCommand = createMockQueueCommand();
      mockCommand.command.onExecute = () => promise;

      consumer.enqueue(mockCommand);
      consumer.start();

      await jest.runOnlyPendingTimersAsync();

      expect(completedCommandExecutionSpy).not.toHaveBeenCalled();

      _resolve(true);

      await jest.runOnlyPendingTimersAsync();

      expect(completedCommandExecutionSpy).toHaveBeenCalledTimes(1);
    });

    test("should handle command processing errors by triggering retry", async () => {
      const retryPolicy = {
        shouldRetry: jest.fn().mockReturnValue(false),
      };

      // Make consumeFunc throw an error to enter retry method.
      consumeFunc.mockImplementation(() => {
        throw new Error("Processing failed");
      });

      consumer = new QueueConsumer(consumeFunc, [], retryPolicy);
      const mockCommand = createMockQueueCommand();
      consumer.enqueue(mockCommand);
      consumer.start();

      await jest.runOnlyPendingTimersAsync();

      expect(retryPolicy.shouldRetry).toHaveBeenCalled();
      expect(mockCommand.queueInfo.attemptNo).toBe(1);
    });
  });

  describe("retry behavior", () => {
    it("should retry failed command when policy allows", () => {
      consumer.retryPolicyEvaluator = {
        shouldRetry: jest.fn().mockReturnValue(true),
      };

      const mockCommand = createMockQueueCommand();
      consumer.queueState.processCount = 1; // Simulate command being processed

      consumer.completedCommandExecution(mockCommand, false);

      expect(consumer.retryPolicyEvaluator.shouldRetry).toHaveBeenCalled();
      expect(mockCommand.queueInfo.status).toBe(QueueStatus.Initial);
      expect(mockCommand.queueInfo.attemptNo).toBe(1);
      expect(consumer.queue.has(mockCommand)).toBe(true);
      expect(consumer.queueState.processCount).toBe(0);
    });

    it("should mark as complete when retry policy denies retry", () => {
      consumer.retryPolicyEvaluator = {
        shouldRetry: jest.fn().mockReturnValue(false),
      };

      const mockCommand = createMockQueueCommand();
      consumer.queueState.processCount = 1; // Simulate command being processed

      consumer.completedCommandExecution(mockCommand, false);

      expect(mockCommand.queueInfo.status).toBe(QueueStatus.Complete);
      expect(mockCommand.onStatusUpdate).toHaveBeenCalledWith(
        QueueStatus.Complete
      );
      expect(mockCommand.completed).toHaveBeenCalledWith(false);
      expect(consumer.queueState.processCount).toBe(0);
    });

    it("should increment attempt number on retry", () => {
      consumer.retryPolicyEvaluator = {
        shouldRetry: jest.fn().mockReturnValue(false),
      };

      const mockCommand = createMockQueueCommand();
      const originalAttemptNo = mockCommand.queueInfo.attemptNo;

      consumer.completedCommandExecution(mockCommand, false);

      expect(mockCommand.queueInfo.attemptNo).toBe(originalAttemptNo + 1);
    });

    it("should handle no retry policy gracefully", () => {
      const mockCommand = createMockQueueCommand();
      consumer.queueState.processCount = 1;

      consumer.completedCommandExecution(mockCommand, false);

      expect(mockCommand.queueInfo.status).toBe(QueueStatus.Complete);
      expect(mockCommand.completed).toHaveBeenCalledWith(false);
    });
  });

  describe("consume conditions", () => {
    it("should respect processCount condition", async () => {
      const maxConcurrentProcesses = 2;
      const processCountCondition = ({ processCount }) =>
        processCount < maxConcurrentProcesses;

      consumer = new QueueConsumer(consumeFunc, [processCountCondition]);

      // Add 3 commands
      const commands = [
        createMockQueueCommand({
          command: { id: "cmd1", onExecute: mockUnResolvedPromise() },
        }),
        createMockQueueCommand({
          command: { id: "cmd2", onExecute: mockUnResolvedPromise() },
        }),
        createMockQueueCommand({
          command: { id: "cmd3", onExecute: mockUnResolvedPromise() },
        }),
      ];

      commands.forEach((cmd) => consumer.enqueue(cmd));
      consumer.start();

      // Process first batch
      await jest.runOnlyPendingTimersAsync();

      // Should have processed 2 commands
      expect(consumeFunc).toHaveBeenCalledTimes(2);
      expect(consumer.queueState.processCount).toBe(2);

      // Complete one command
      consumer.completedCommandExecution(commands[0], true);
      await jest.runOnlyPendingTimersAsync();

      // Should process the third command
      expect(consumeFunc).toHaveBeenCalledTimes(3);
    });
  });
});

const mockUnResolvedPromise = () =>
  jest.fn(() => ({
    then: jest.fn(),
    catch: jest.fn(),
  }));

const mockResolvedPromise = () =>
  jest.fn(() => ({
    then: jest.fn((callback) => {
      callback(true); // Call the callback with the desired value (success: true | false)
      return { catch: jest.fn() }; // Return a mock for chaining
    }),
    catch: jest.fn(),
  }));

// Mock helper function to create test queue commands
const createMockQueueCommand = (overrides = {}) => {
  const mockUserCommand = {
    id: "test-command-1",
    executed: jest.fn(),
    onExecute: mockUnResolvedPromise(),
    ...overrides,
  };

  return {
    command: mockUserCommand,
    queueInfo: {
      status: QueueStatus.Initial,
      attemptNo: 0,
      ...overrides.queueInfo,
    },
    onStatusUpdate: jest.fn(),
    completed: jest.fn(),
    ...overrides,
  };
};
