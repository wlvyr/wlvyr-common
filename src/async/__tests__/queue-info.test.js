import { jest, describe, it, expect, afterEach  } from "@jest/globals";
import { QueueInfo, QueueStatus} from "@wlvyr/common/async";

describe("QueueInfo", () => {
    it("should initialize with default values", () => {
      const info = new QueueInfo();
      expect(info.attemptNo).toBe(0);
      expect(typeof info.dateCreated).toBe("number");
      expect(info.status).toBe(QueueStatus.Initial);
    });
});
