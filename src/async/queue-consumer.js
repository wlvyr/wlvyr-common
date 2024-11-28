/*---------------------------------------------------------------------------------------------
 *  Copyright (c) wlvyr. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { UserCommand } from "@/src/common/user-command.js";
import { ErrorMessages } from "@/src//error/error-messages.js";
import { QueueCommand } from "./queue-command.js";
import { QueueStatus } from "./queue-status.js";
import { RetryPolicyEvaluator } from "./retry-policy-evaluator.js";

/**
 * Consumes and processes queued commands with optional retry support.
 */
export class QueueConsumer {
  /**
   * @param {(command: UserCommand) => void} consumeFunc - The function to process a command.
   * @param {(( params: { processCount: number } ) => boolean)[]} [consumeConditions=[]] - List of conditions to satisfy before consuming.
   * @param {RetryPolicyEvaluator | undefined} [retryPolicyEvaluator=undefined]
   */
  constructor(
    // can be dispatch(command), or can be (command) => command.execute().
    consumeFunc,
    consumeConditions = [],
    retryPolicyEvaluator = undefined
  ) {
    if (!consumeFunc) {
      throw new TypeError(
        `${ErrorMessages.Exceptions.ArgumentUndefinedException}, "consumeFunc"`
      );
    }

    this.consumeFunc = consumeFunc;
    this.consumeConditions = consumeConditions;
    this.retryPolicyEvaluator = retryPolicyEvaluator;

    this.isRunning = false;
    this.queueState = { processCount: 0 };
    /** @type {Set<QueueCommand>} */
    this.queue = new Set();
    /**
     * @type {((value?: void) => void) | undefined}
     */
    this.resumeResolver = undefined;
  }

  /** Starts the queue consumer. */
  start = () => {
    let wasRunning = this.isRunning;

    this.isRunning = true;
    this.#resumeOnConditionsSatisfied();

    if (!wasRunning) {
      this.#consume();
    }
  };

  /** Pauses the queue consumer. */
  stop = () => {
    this.isRunning = false;
  };

  /**
   * Enqueues a command to be processed.
   * @param {QueueCommand} queueCommand
   */
  enqueue = (queueCommand) => {
    if (queueCommand.command === undefined) {
      throw new TypeError(
        `${ErrorMessages.Exceptions.ArgumentUndefinedException}, "queueCommand.command"`
      );
    }

    if (queueCommand.queueInfo === undefined) {
      throw new TypeError(
        `${ErrorMessages.Exceptions.ArgumentUndefinedException}, "queueCommand.queueInfo"`
      );
    }

    this.queue.add(queueCommand);
    this.#resumeOnConditionsSatisfied();
  };

  /**
   * Removes a command from the queue.
   * @param {QueueCommand} queueCommand
   */
  remove = (queueCommand) => {
    this.queue.delete(queueCommand);
  };

  /** Can be called when external consume condition state changes. */
  consumeConditionStateUpdatedEvtListenerAction = () => {
    this.#resumeOnConditionsSatisfied();
  };

  /**
   * Marks command execution as complete or retries if needed.
   * @param {QueueCommand} queueCommand
   * @param {boolean} success
   */
  completedCommandExecution = (queueCommand, success) => {
    if (success) {
      queueCommand.queueInfo.status = QueueStatus.Complete;
      queueCommand?.completed((success = true));
      this.queueState.processCount--;
    } else {
      this.#handleRetry(queueCommand);
    }

    this.#resumeOnConditionsSatisfied();
  };

  /**
   * Removes and returns the next item from the queue.
   * If the queue is empty, returns undefined.
   *
   * @returns {QueueCommand | undefined} The dequeued item, or undefined if the queue is empty.
   */
  #dequeue = () => {
    /** @type {QueueCommand | undefined } */
    let nextItem = this.queue.values().next().value;
    this.queue.delete(/** @type {any} */ (nextItem));
    return nextItem;
  };

  /**
   * Continuously consumes and processes commands from the queue while `isRunning` is true.
   *
   * The consumer waits (via a Promise) if the queue is empty or if any of the
   * `consumeConditions` are not satisfied. When conditions allow, it dequeues
   * the next command and processes it.
   *
   * This method runs an infinite loop controlled by `this.isRunning`.
   *
   * @async
   * @returns {Promise<void>} Resolves when `isRunning` becomes false and the loop ends.
   */
  #consume = async () => {
    while (this.isRunning) {
      if (
        this.#shouldConsumerWait(
          this.queue,
          this.consumeConditions,
          this.queueState
        )
      ) {
        await this.#createWaitPromise(this);
      }

      let queueCommand = this.#dequeue();
      this.#processCommand(/** @type {any} */ (queueCommand));
    }
  };

  /**
   * Processes a single command from the queue.
   * @param {QueueCommand} queueCommand
   */
  #processCommand = async (queueCommand) => {
    try {
      /** @type {UserCommand} */
      const userCommand = queueCommand.command;

      // when userCommand.executed(true|false) has been invoked, 
      // this will complete the queueCommand associated with the usercommand
      // mandatory for client to invoke this for QueueConsumer to work properly.
      userCommand.onExecute().then((success) => {
        this.completedCommandExecution(queueCommand, success || false);
      });

      queueCommand.queueInfo.status = QueueStatus.Processing;
      queueCommand.onStatusUpdate(QueueStatus.Processing);
      this.queueState.processCount++;

      this.consumeFunc(queueCommand.command);
    } catch (err) {
      this.#handleRetry(queueCommand);
    }
  };

  /**
   * Handles retry logic if a command fails.
   * @param {QueueCommand} queueCommand
   */
  #handleRetry = (queueCommand) => {
    let { command, queueInfo } = queueCommand;

    queueInfo.attemptNo++;

    const shouldRetry =
      this.retryPolicyEvaluator?.shouldRetry(command, queueInfo) ?? false;

    if (shouldRetry) {
      queueInfo.status = QueueStatus.Initial;
      this.enqueue(queueCommand);
      this.#resumeOnConditionsSatisfied();
    } else {
      queueInfo.status = QueueStatus.Complete;
      queueCommand.onStatusUpdate(QueueStatus.Complete);
      // isSuccessful: false
      queueCommand?.completed(false);
    }

    this.queueState.processCount--;
  };

  /** Resumes the consumer if conditions are satisfied. */
  #resumeOnConditionsSatisfied = () => {
    if (
      this.isRunning &&
      this.queue.size &&
      this.resumeResolver &&
      this.consumeConditions?.every((conditionSatisfied) =>
        conditionSatisfied(this.queueState)
      )
    ) {
      this.resumeResolver();
      this.resumeResolver = undefined;
    }
  };

  /**
   * @param {Set<any>} queue
   * @param {(( params: { processCount: number } ) => boolean)[]} consumeConditions
   * @param {any} queueState
   * @returns
   */
  #shouldConsumerWait = (queue, consumeConditions, queueState) => {
    return (
      !queue.size ||
      consumeConditions?.some((condition) => !condition(queueState))
    );
  };

  /**
   * Creates a promise that resolves when the consumer's resumeResolver is called.
   *
   * @param {QueueConsumer} consumer - The consumer instance to work with.
   * @returns {Promise<void>} A promise that resolves when the consumer's resumeResolver is invoked.
   */
  #createWaitPromise = (consumer) => {
    return new Promise((resolve) => {
      consumer.resumeResolver = resolve;
    });
  };
}