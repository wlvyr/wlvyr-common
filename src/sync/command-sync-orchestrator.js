/*---------------------------------------------------------------------------------------------
 *  Copyright (c) wlvyr. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { QueueCommand } from "@/src/async/queue-command.js";
import { QueueConsumer } from "@/src/async/queue-consumer.js";
import { QueueStatus } from "@/src/async/queue-status.js";
import { UserCommand } from "@/src/common/user-command.js";
import { IObjectConsolidator } from "@/src/common/iobject-consolidator.js";
import { IStorage } from "@/src/storage/istorage.js";

/**
 * Orchestrates command execution using the queue and optional persistence.
 */
export class CommandSyncOrchestrator {
  /**
   * @param {string} id - Unique identifier for the orchestrator.
   * @param {QueueConsumer} queueConsumer
   * @param {IObjectConsolidator} [commandConsolidator]
   * @param {IStorage} [offlineStorage]
   *
   * oldparam {{ save: (key: string, q: Object) => void, loadByKeyPrefix: (prefix: string) => Object[], remove: (key: string) => void }} [offlineStorage]
   */
  constructor(
    id, // can be a uuid. it's to uniquely identify the orchestrator, maybe for localDB id.
    queueConsumer,
    commandConsolidator = undefined,
    offlineStorage = undefined
  ) {
    this.id = id;
    this.queueConsumer = queueConsumer;
    this.commandConsolidator = commandConsolidator;
    this.offlineStorage = offlineStorage;

    /** @type {Set<QueueCommand>} */
    this.queueCommands = new Set();

    /** @type {Map<string, QueueCommand>} */
    // string key can only be tied to resource id
    this.patchQueueCommands = new Map();

    this.initialized = false;
  }

  /** Loads existing commands and initializes the orchestrator. */
  initializeAsync = async () => {
    await this.#loadCommandsAsync(this.id);
    this.initialized = true;
  };

  /**
   * Handles an incoming user command.
   * @param {UserCommand} userCommand
   */
  handleCommandAsync = async (userCommand) => {
    this.#ensureInitialized();

    let queueCommand;

    if (!userCommand.meta?.isPatch ||
      !userCommand.meta?.resourceId) { // not a patch or not a resource action
      queueCommand = new QueueCommand(userCommand);
    } else {
      queueCommand = this.#consolidateCommand(userCommand);
    }

    queueCommand.onComplete().then(async (success) => {
      await this.#removeQueueCommandAsync(queueCommand);
    });

    await this.offlineStorage?.saveAsync(
      this.#getKey(queueCommand),
      queueCommand
    );
    this.queueCommands.add(queueCommand);
    this.queueConsumer.enqueue(queueCommand);
  };

  start = () => {
    this.#ensureInitialized();
    this.queueConsumer.start();
  };

  stop = () => {
    this.queueConsumer.stop();
  };

  /**
   * Stops sync and removes all actions, including any saved data in storage.
   */
  dispose = () => {
    this.queueConsumer.stop();
    this.queueCommands.forEach((queueCommand) =>
      this.#removeQueueCommandAsync(queueCommand)
    ); // this should also handle... this.offlineStorage.removeAllByPrefix(`${id}-`);
    this.queueCommands.clear();
    this.patchQueueCommands.clear();
  };

  /**
   * Loads commands from persistent storage.
   * @param {string} id
   */
  #loadCommandsAsync = async (id) => {
    if (this.initialized) return;

    const data = await this.offlineStorage?.loadByKeyPrefixAsync(`${id}-`);

    if (!Array.isArray(data)) {
      return;
    }

    data.forEach((obj) => {
      const queueCommand = Object.create(QueueCommand.prototype);
      Object.assign(queueCommand, obj);

      this.queueCommands.add(queueCommand);
      this.queueConsumer.enqueue(queueCommand);

      const commandMeta = queueCommand.command.meta;
      if (commandMeta?.isPatch) {
        this.patchQueueCommands.set(commandMeta.resourceId, queueCommand);
      }
    });
  };

  /**
   * Removes a command from orchestration.
   * @param {QueueCommand} queueCommand
   */
  #removeQueueCommandAsync = async (queueCommand) => {
    await this.offlineStorage?.removeAsync(this.#getKey(queueCommand));
    this.queueCommands.delete(queueCommand);
    this.patchQueueCommands.delete(queueCommand.command.meta?.resourceId);
    this.queueConsumer.remove(queueCommand);
  };

  /**
   * Consolidates a patch command with an existing one.
   * @param {UserCommand} userCommand
   * @returns {QueueCommand}
   */
  #consolidateCommand = (userCommand) => {
    this.queueConsumer.stop();
    const queueCommand = this.#buildConsolidatedCommand(userCommand);
    this.queueConsumer.start();
    return queueCommand;
  };

  /**
   *
   * @param {UserCommand} userCommand
   * @returns {QueueCommand}
   */
  #buildConsolidatedCommand = (userCommand) => {
    const commandMeta = userCommand.meta;
    const existingQueueCommand = this.patchQueueCommands.get(
      commandMeta.resourceId
    );

    /** @type {QueueCommand | undefined} */
    let queueCommand = undefined;

    if (
      existingQueueCommand &&
      existingQueueCommand.queueInfo.status === QueueStatus.Initial &&
      this.commandConsolidator
    ) {
      const newPayload = this.commandConsolidator.consolidate(
        userCommand.payload,
        existingQueueCommand.command.payload
      );

      this.#removeQueueCommandAsync(existingQueueCommand);
      queueCommand = new QueueCommand({ ...userCommand, payload: newPayload });
    }

    queueCommand = queueCommand ?? new QueueCommand(userCommand);
    this.patchQueueCommands.set(commandMeta.resourceId, queueCommand);
    return queueCommand;
  };

  /**
   * Returns the queueCommand key in the context of this orchestrator
   * @param {QueueCommand} queueCommand
   * @returns {string}
   */
  #getKey = (queueCommand) => {
    return `${this.id}-${queueCommand.command.meta.ReferenceId}`;
  };

  #ensureInitialized() {
    if (!this.initialized)
      throw new Error("Initialized. Call initialize() first.");
  }
}
