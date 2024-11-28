import { jest, describe, it, expect, afterEach } from "@jest/globals";
import { RetryPolicyEvaluator, AttempNoRetryCondition } from "@wlvyr/common/async";

describe("RetryPolicyEvaluator", () => {
  test("shouldRetry returns true if any condition returns true", () => {
    const condTrue = { shouldRetry: jest.fn().mockReturnValue(true) };
    const condFalse = { shouldRetry: jest.fn().mockReturnValue(false) };
    const evaluator = new RetryPolicyEvaluator([condFalse, condTrue]);

    expect(evaluator.shouldRetry({}, {})).toBe(true);
    expect(condFalse.shouldRetry).toHaveBeenCalled();
    expect(condTrue.shouldRetry).toHaveBeenCalled();
  });

  test("shouldRetry returns false if no conditions return true", () => {
    const condFalse1 = { shouldRetry: jest.fn().mockReturnValue(false) };
    const condFalse2 = { shouldRetry: jest.fn().mockReturnValue(false) };
    const evaluator = new RetryPolicyEvaluator([condFalse1, condFalse2]);

    expect(evaluator.shouldRetry({}, {})).toBe(false);
  });

  test("addCondition adds a condition", () => {
    const evaluator = new RetryPolicyEvaluator();
    const cond = new AttempNoRetryCondition(1);
    evaluator.addCondition(cond);
    expect(evaluator.conditions).toContain(cond);
  });
});
