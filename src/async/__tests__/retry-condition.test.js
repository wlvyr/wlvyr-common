import { jest, describe, it, expect, afterEach } from "@jest/globals";
import { IRetryCondition, AttempNoRetryCondition } from "@wlvyr/common/async";
import { ErrorMessages } from "@wlvyr/common/error";

describe("IRetryCondition", () => {
  test("shouldRetry throws Not implemented error", () => {
    const cond = new IRetryCondition();
    expect(() => cond.shouldRetry({}, {})).toThrow(ErrorMessages.Exceptions.NotImplemented);
  });
});

describe("AttempNoRetryCondition", () => {
  test("shouldRetry returns true if attempts are less than retryCount", () => {
    const cond = new AttempNoRetryCondition(3);
    expect(cond.shouldRetry({}, { attemptNo: 2 })).toBe(true);
  });

  test("shouldRetry returns false if attempts exceed retryCount", () => {
    const cond = new AttempNoRetryCondition(3);
    expect(cond.shouldRetry({}, { attemptNo: 3 })).toBe(false);
  });
});
