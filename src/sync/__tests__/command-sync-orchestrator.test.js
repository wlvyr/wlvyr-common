import { CommandSyncOrchestrator } from "@wlvyr/common/sync";
import { QueueCommand, QueueStatus } from "@wlvyr/common/async";
import { UserCommand } from "@wlvyr/common";

jest.mock("@wlvyr/common/async/queue-command");

describe("CommandSyncOrchestrator", () => {
  let queueConsumerMock;
  let offlineStorageMock;
  let commandConsolidatorMock;
  let orchestrator;
  const id = "test-id";

  beforeEach(() => {
    jest.useFakeTimers();

    queueConsumerMock = {
      enqueue: jest.fn(),
      remove: jest.fn(),
      stop: jest.fn(),
      start: jest.fn(),
    };
    offlineStorageMock = {
      saveAsync: jest.fn(),
      removeAsync: jest.fn(),
      loadByKeyPrefixAsync: jest.fn().mockReturnValue([]),
    };
    commandConsolidatorMock = {
      consolidate: jest.fn((a, b) => a),
    };

    let queueCommandPromiseResolve = undefined;
    const queueCommandPromise = new Promise((resolve) => {
      queueCommandPromiseResolve = resolve
    });

    QueueCommand.mockImplementation((userCommand) => ({
      command: userCommand,
      queueInfo: { status: QueueStatus.Initial },
      _onComplete: {
        resolve: queueCommandPromiseResolve,
        promise: queueCommandPromise
      },
      onComplete: jest.fn().mockImplementation(() => queueCommandPromise),
      completed: jest.fn().mockImplementation(() => queueCommandPromiseResolve(true)),
    }));

    orchestrator = new CommandSyncOrchestrator(
      "test-id",
      queueConsumerMock,
      commandConsolidatorMock,
      offlineStorageMock
    );
  });

  test("initializeAsync loads commands once", async () => {
    orchestrator.initializeAsync();

    // Let the consumer try to process
    await jest.runOnlyPendingTimersAsync();

    expect(offlineStorageMock.loadByKeyPrefixAsync).toHaveBeenCalledWith(
      `${id}-`
    );
    expect(orchestrator.initialized).toBe(true);

    // Calling again should not reload
    offlineStorageMock.loadByKeyPrefixAsync.mockClear();

    orchestrator.initializeAsync();

    // Let the consumer try to process
    await jest.runOnlyPendingTimersAsync();

    expect(offlineStorageMock.loadByKeyPrefixAsync).not.toHaveBeenCalled();
  });

  test("throws if handleCommandAsync is called without initializeAsync", async () => {
    const userCommand = { meta: {} };
    await expect(() =>
      orchestrator.handleCommandAsync(userCommand)
    ).rejects.toThrow("Initialized. Call initialize() first.");
  });

  test("throws if start is called without initializeAsync", () => {
    expect(() => orchestrator.start()).toThrow(
      "Initialized. Call initialize() first."
    );
  });

  test("start calls queueConsumer.start if initialized", async () => {
    orchestrator.initializeAsync();

    // Let the consumer try to process
    await jest.runOnlyPendingTimersAsync();

    orchestrator.start();
    expect(queueConsumerMock.start).toHaveBeenCalled();
  });

  test("stop calls queueConsumer.stop", () => {
    orchestrator.stop();
    expect(queueConsumerMock.stop).toHaveBeenCalled();
  });

  test("handleCommandAsync enqueues non-patch commands", async () => {
    const userCommand = { meta: { isPatch: false } };

    orchestrator.initialized = true;

    orchestrator.handleCommandAsync(userCommand);

    // Let the consumer try to process
    await jest.runOnlyPendingTimersAsync();

    expect(offlineStorageMock.saveAsync).toHaveBeenCalled();
    expect(queueConsumerMock.enqueue).toHaveBeenCalled();
  });

  test("handleCommandAsync consolidates patch commands", async () => {
    const patchCommand = { meta: { isPatch: true, resourceId: "res1" } };

    orchestrator.patchQueueCommands.set("res1", {
      queueInfo: { status: QueueStatus.Initial },
      command: { meta: patchCommand.meta },
      onComplete: jest.fn().mockImplementation(() => new Promise()),
    });

    orchestrator.initialized = true;
    orchestrator.handleCommandAsync(patchCommand);

    // Let the consumer try to process
    await jest.runOnlyPendingTimersAsync();

    expect(queueConsumerMock.stop).toHaveBeenCalled();
    expect(commandConsolidatorMock.consolidate).toHaveBeenCalled();
    expect(queueConsumerMock.start).toHaveBeenCalled();
  });

  test("handleCommandAsync does not fail if offlineStorage is undefined", async () => {
    orchestrator = new CommandSyncOrchestrator(
      "test-id",
      queueConsumerMock,
      commandConsolidatorMock,
      undefined // offlineStorage
    );

    const userCommand = { meta: { isPatch: false } };

    orchestrator.initialized = true;

    await expect(orchestrator.handleCommandAsync(userCommand)).resolves.not.toThrow();
  });

  test("handleCommandAsync does not fail if commandConsolidator is undefined", async () => {
    orchestrator = new CommandSyncOrchestrator(
      "test-id",
      queueConsumerMock,
      undefined, // commandConsolidator
      offlineStorageMock
    );

    const patchCommand = { meta: { isPatch: true, resourceId: "res1" } };
    orchestrator.patchQueueCommands.set("res1", {
      queueInfo: { status: QueueStatus.Initial },
      command: patchCommand,
    });

    orchestrator.initialized = true;

    await expect(
      orchestrator.handleCommandAsync(patchCommand)
    ).resolves.not.toThrow();
  });

  test("onComplete (async) callback removes command from tracking", async () => {
    const userCommand = new UserCommand();
    userCommand.meta = {
      isPatch: false,
      ReferenceId: "ref123",
      resourceId: "res123",
    }; // non-patch case
    orchestrator.initialized = true;

    orchestrator.handleCommandAsync(userCommand);
    // Let the consumer try to process
    await jest.runOnlyPendingTimersAsync();

    // Get the QueueCommand that was enqueued
    const queueCommand = queueConsumerMock.enqueue.mock.calls[0][0];

    // Simulate completion
    queueCommand.completed(false);

    // Let the consumer try to process
    await jest.runOnlyPendingTimersAsync();

    // Assertions

    // if `test-id-${userCommand.meta.ReferenceId}` assertion is to be removed, need to to create new test
    // to ensure #getKey is correct.
    expect(offlineStorageMock.removeAsync).toHaveBeenCalledWith(
      `test-id-${userCommand.meta.ReferenceId}`
    );
    expect(queueConsumerMock.remove).toHaveBeenCalledWith(queueCommand);
    expect(orchestrator.queueCommands.has(queueCommand)).toBe(false);
    expect(
      orchestrator.patchQueueCommands.has(userCommand.meta.resourceId)
    ).toBe(false); // safe even if meta.resourceId is undefined
  });

  test("dispose stops consumer and removes all queue commands", async () => {
    const userCommand1 = { meta: { ReferenceId: "1" } };
    const userCommand2 = {
      meta: { ReferenceId: "2", resourceId: "r2", isPatch: true },
    };

    const queueCommand1 = new QueueCommand(userCommand1);
    const queueCommand2 = new QueueCommand(userCommand2);

    orchestrator.queueCommands.add(queueCommand1);
    orchestrator.queueCommands.add(queueCommand2);
    orchestrator.patchQueueCommands.set("r2", queueCommand2);

    orchestrator.dispose(); // optionally `await` if you want to let all queued asyncs finish

    // Let the consumer try to process
    await jest.runOnlyPendingTimersAsync();

    expect(queueConsumerMock.stop).toHaveBeenCalled();
    expect(offlineStorageMock.removeAsync).toHaveBeenCalledWith("test-id-1");
    expect(offlineStorageMock.removeAsync).toHaveBeenCalledWith("test-id-2");
    expect(queueConsumerMock.remove).toHaveBeenCalledWith(queueCommand1);
    expect(queueConsumerMock.remove).toHaveBeenCalledWith(queueCommand2);
    expect(orchestrator.queueCommands.size).toBe(0);
    expect(orchestrator.patchQueueCommands.size).toBe(0);
  });
});
