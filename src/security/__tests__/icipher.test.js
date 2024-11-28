import { ICipher } from "@wlvyr/common/security"; // or wherever ICipher is located

describe("ICipher interface", () => {
  let cipher;

  beforeEach(() => {
    cipher = new ICipher();
  });

  test("encryptAsync should throw Not implemented error", async () => {
    await expect(cipher.encryptAsync({ foo: "bar" })).rejects.toThrow("Not implemented");
  });

  test("decryptAsync should throw Not implemented error", async () => {
    await expect(cipher.decryptAsync("encrypted-string")).rejects.toThrow("Not implemented");
  });
});
