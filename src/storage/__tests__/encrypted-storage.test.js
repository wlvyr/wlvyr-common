import { EncryptedStorage } from "@wlvyr/common/storage";

describe("EncryptedStorage", () => {
  let mockCipher;
  let mockStorage;
  let encryptedStorage;

  beforeEach(() => {
    // Mock ICipher interface with jest.fn()
    mockCipher = {
      encryptAsync: jest.fn(),
      decryptAsync: jest.fn(),
    };

    // Mock IStorage interface
    mockStorage = {
      saveAsync: jest.fn(),
      loadAsync: jest.fn(),
      removeAsync: jest.fn(),
      loadByKeyPrefixAsync: jest.fn(),
    };

    encryptedStorage = new EncryptedStorage(mockCipher, mockStorage);
  });

  test("saveAsync encrypts value and calls storage.saveAsync", async () => {
    const key = "user:123";
    const value = { secret: "data" };
    const encryptedValue = "encryptedData";

    mockCipher.encryptAsync.mockResolvedValue(encryptedValue);
    mockStorage.saveAsync.mockResolvedValue();

    await encryptedStorage.saveAsync(key, value);

    expect(mockCipher.encryptAsync).toHaveBeenCalledWith(value);
    expect(mockStorage.saveAsync).toHaveBeenCalledWith(key, encryptedValue);
  });

  test("removeAsync calls storage.removeAsync", async () => {
    const key = "user:123";

    mockStorage.removeAsync.mockResolvedValue();

    await encryptedStorage.removeAsync(key);

    expect(mockStorage.removeAsync).toHaveBeenCalledWith(key);
  });

  test("loadAsync calls storage.loadAsync and decryptAsync", async () => {
    const key = "user:123";
    const encryptedValue = "encryptedData";
    const decryptedValue = { secret: "data" };

    mockStorage.loadAsync.mockResolvedValue(encryptedValue);
    mockCipher.decryptAsync.mockResolvedValue(decryptedValue);

    const result = await encryptedStorage.loadAsync(key);

    expect(mockStorage.loadAsync).toHaveBeenCalledWith(key);
    expect(mockCipher.decryptAsync).toHaveBeenCalledWith(encryptedValue);
    expect(result).toEqual(decryptedValue);
  });

  test("loadByKeyPrefixAsync calls storage.loadByKeyPrefixAsync and decryptAsync for each item", async () => {
    const keyPrefix = "user:";
    const encryptedValues = ["enc1", "enc2", "enc3"];
    const decryptedValues = [{ id: 1 }, { id: 2 }, { id: 3 }];

    mockStorage.loadByKeyPrefixAsync.mockResolvedValue(encryptedValues);
    mockCipher.decryptAsync
      .mockResolvedValueOnce(decryptedValues[0])
      .mockResolvedValueOnce(decryptedValues[1])
      .mockResolvedValueOnce(decryptedValues[2]);

    const result = await encryptedStorage.loadByKeyPrefixAsync(keyPrefix);

    expect(mockStorage.loadByKeyPrefixAsync).toHaveBeenCalledWith(keyPrefix);
    expect(mockCipher.decryptAsync).toHaveBeenCalledTimes(encryptedValues.length);
    encryptedValues.forEach((val, i) => {
      expect(mockCipher.decryptAsync).toHaveBeenNthCalledWith(i + 1, val);
    });
    expect(result).toEqual(decryptedValues);
  });
});
