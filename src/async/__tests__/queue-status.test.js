import { jest, describe, it, expect, afterEach } from "@jest/globals";
import { QueueStatus } from "@wlvyr/common/async";

describe("QueueStatus", () => {
    it("should have correct enum values", () => {
      expect(QueueStatus.Initial).toBe("Initial");
      expect(QueueStatus.Processing).toBe("Processing");
      expect(QueueStatus.Complete).toBe("Complete");
    });
  });