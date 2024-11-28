import sodium from "libsodium-wrappers-sumo";
import { PasswordCipher } from "@wlvyr/common/security";

describe("PasswordCipher", () => {
  const password = "test-password";
  // let sodium;
  let salt;

  beforeAll(async () => {
    await sodium.ready;
    salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
  });

  test("should throw on invalid salt", async () => {
    // Create instance
    const cipher = new PasswordCipher(password, "invalid-salt");

    // Wait for initialization, expect it to reject
    await expect(cipher.initPromise).rejects.toThrow();

    // Same for too-short Uint8Array
    const cipher2 = new PasswordCipher(password, new Uint8Array(5));
    await expect(cipher2.initPromise).rejects.toThrow();
  });

  test("should encrypt and decrypt an object successfully", async () => {
    const cipher = new PasswordCipher(password, salt);

    const original = { foo: "bar", count: 42 };
    const encrypted = await cipher.encryptAsync(original);
    expect(typeof encrypted).toBe("string");

    const decrypted = await cipher.decryptAsync(encrypted);
    expect(decrypted).toEqual(original);
  });

  test("should throw error when decrypting corrupted data", async () => {
    const cipher = new PasswordCipher(password, salt);

    const original = { foo: "bar" };
    const encrypted = await cipher.encryptAsync(original);

    // Corrupt the encrypted string by changing a character
    const corrupted =
      encrypted.slice(0, -1) + (encrypted.slice(-1) === "A" ? "B" : "A");

    await expect(cipher.decryptAsync(corrupted)).rejects.toThrow(
      "wrong secret key for the given ciphertext"
    );
  });

  test("encrypting the same object twice produces different ciphertexts", async () => {
    const cipher = new PasswordCipher(password, salt);

    const obj = { a: 1, b: 2 };
    const encrypted1 = await cipher.encryptAsync(obj);
    const encrypted2 = await cipher.encryptAsync(obj);

    expect(encrypted1).not.toEqual(encrypted2);
  });
});
