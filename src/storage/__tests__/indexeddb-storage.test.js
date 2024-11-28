import { IndexedDBStorage } from "@wlvyr/common/storage";

describe("IndexedDBStorage", () => {
  let dbMock;
  let requestMock;
  let transactionMock;
  let objectStoreMock;
  let storage;

  const DB_VERSION = 2;
  const DB_NAME = "test-db";
  const STORE_ID = "test-store";

  beforeEach(() => {
    // Reset mocks for each test

    dbMock = {
      transaction: jest.fn(),
      objectStoreNames: {
        contains: jest.fn(() => false), // By default no object store exists
      },
      createObjectStore: jest.fn(),
    };

    requestMock = {
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: dbMock,
      error: null,
    };

    transactionMock = {
      objectStore: jest.fn(),
      oncomplete: null,
      onerror: null,
      error: null,
    };

    objectStoreMock = {
      put: jest.fn(),
      delete: jest.fn(),
      get: jest.fn(),
      openCursor: jest.fn(),
    };

    // Mock indexedDB.open to return the requestMock object
    global.indexedDB = {
      open: jest.fn(() => requestMock),
    };

    global.IDBKeyRange = {
      bound: jest.fn((lower, upper, lowerOpen, upperOpen) => ({
        lower,
        upper,
        lowerOpen,
        upperOpen,
        type: "bound",
      })),
    };

    storage = new IndexedDBStorage(DB_VERSION, DB_NAME, STORE_ID);

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function triggerOpenLifecycle({ withUpgrade = false } = {}) {
    if (withUpgrade && typeof requestMock.onupgradeneeded === "function") {
      requestMock.onupgradeneeded({ target: requestMock });
    }
    if (typeof requestMock.onsuccess === "function") {
      requestMock.onsuccess({ target: requestMock });
    }
  }

  test("initializeStorageAsync creates object store if needed and resolves", async () => {
    // Simulate store missing so onupgradeneeded triggers store creation
    dbMock.objectStoreNames.contains.mockReturnValue(false);

    const promise = storage.initializeStorageAsync();
    triggerOpenLifecycle({ withUpgrade: true });
    await promise;

    expect(global.indexedDB.open).toHaveBeenCalledWith(DB_NAME, DB_VERSION);
    expect(dbMock.objectStoreNames.contains).toHaveBeenCalledWith(STORE_ID);
    expect(dbMock.createObjectStore).toHaveBeenCalledWith(STORE_ID, {
      keyPath: "id",
    });
    expect(storage.db).toBe(dbMock);
  });

  test("initializeStorageAsync resolves if store already exists", async () => {
    dbMock.objectStoreNames.contains.mockReturnValue(true);

    const promise = storage.initializeStorageAsync();
    triggerOpenLifecycle({ withUpgrade: true });
    await promise;

    expect(dbMock.createObjectStore).not.toHaveBeenCalled();
  });

  describe("after initialization", () => {
    beforeEach(async () => {
      dbMock.transaction.mockReturnValue(transactionMock);
      transactionMock.objectStore.mockReturnValue(objectStoreMock);

      // Initialize storage so this.db is set
      const promise = storage.initializeStorageAsync();
      triggerOpenLifecycle({ withUpgrade: false });
      await promise;
    });

    test("saveAsync stores object", async () => {
      const key = "key1";
      const value = { foo: "bar" };

      const request = {
        onsuccess: null,
        onerror: null,
        error: null,
      };

      objectStoreMock.put.mockReturnValue(request);

      const promise = storage.saveAsync(key, value);

      // simulate success
      setTimeout(() => {
        if (transactionMock.oncomplete) transactionMock.oncomplete();
      }, 0);

      jest.advanceTimersByTime(10);

      // Before resolve, test put called correctly
      expect(objectStoreMock.put).toHaveBeenCalledWith({
        id: key,
        payload: value,
      });

      // Complete the transaction
      await expect(promise).resolves.toBeUndefined();
    });

    test("saveAsync rejects on request error", async () => {
      const key = "key1";
      const value = { foo: "bar" };

      const request = {
        onsuccess: null,
        onerror: null,
        error: null,
      };

      const simualtedError = "simulating error";

      objectStoreMock.put.mockReturnValue(request);

      const promise = storage.saveAsync(key, value);

      // simulate request failure
      setTimeout(() => {
        if (request.onerror) {
          request.error = simualtedError;
          request.onerror();
        }
      }, 0);

      jest.advanceTimersByTime(10);

      // Before resolve, test put called correctly
      expect(objectStoreMock.put).toHaveBeenCalledWith({
        id: key,
        payload: value,
      });

      // Complete the transaction
      await expect(promise).rejects.toEqual(simualtedError);
    });

    test("saveAsync rejects on transaction error", async () => {
      const key = "key1";
      const value = { foo: "bar" };

      const request = {
        onsuccess: null,
        onerror: null,
        error: null,
      };

      const simualtedError = "simulating error";

      objectStoreMock.put.mockReturnValue(request);

      const promise = storage.saveAsync(key, value);

      // Simulate transaction error
      setTimeout(() => {
        if (transactionMock.onerror) {
          transactionMock.error = simualtedError;
          transactionMock.onerror();
        }
      }, 0);

      jest.advanceTimersByTime(10);

      await expect(promise).rejects.toEqual(simualtedError);
    });

    test("removeAsync deletes object by key", async () => {
      const key = "key1";
      const request = {
        onsuccess: null,
        onerror: null,
        error: null,
      };
      objectStoreMock.delete.mockReturnValue(request);

      const promise = storage.removeAsync(key);

      // simulate success
      setTimeout(() => {
        if (request.onsuccess) request.onsuccess();
      }, 0);

      jest.advanceTimersByTime(10);

      expect(objectStoreMock.delete).toHaveBeenCalledWith(key);

      await expect(promise).resolves.toBeUndefined();
    });

    test("loadAsync loads object by key", async () => {
      const key = "key1";
      const payload = { foo: "bar" };

      const request = {
        onsuccess: null,
        onerror: null,
        result: { payload },
        error: null,
      };
      objectStoreMock.get.mockReturnValue(request);

      const promise = storage.loadAsync(key);

      // simulate success
      setTimeout(() => {
        if (request.onsuccess) request.onsuccess();
      }, 0);

      jest.advanceTimersByTime(10);

      expect(objectStoreMock.get).toHaveBeenCalledWith(key);

      await expect(promise).resolves.toEqual(payload);
    });

    test("loadAsync returns null if no record", async () => {
      const key = "key1";

      const request = {
        onsuccess: null,
        onerror: null,
        result: undefined,
        error: null,
      };
      objectStoreMock.get.mockReturnValue(request);

      const promise = storage.loadAsync(key);

      setTimeout(() => {
        if (request.onsuccess) request.onsuccess();
      }, 0);

      jest.advanceTimersByTime(10);

      await expect(promise).resolves.toBeUndefined(); // because request.result?.payload is undefined
    });

    // cannot test yet because need to update logic of function being tested.
    test("loadByKeyPrefixAsync loads all objects with prefix", async () => {
      const cursorValues = [
        { key: "test-1", value: { payload: { a: 1 } } },
        { key: "test-2", value: { payload: { a: 2 } } },
        { key: "test-3", value: { payload: { a: 3 } } },
        // batchSize is 50 (double check and see loadByKeyPrefixAsync const batchSize)
        // need 51 items to see second batch.
      ];

      let cursorIndex = 0; // Define here to persist across openCursor calls
      let callCount = 0; // track how many times openCursor is called

      objectStoreMock.openCursor.mockImplementation(() => {
        let localIndex = cursorIndex; // snapshot for this cursor
        let cursor = null;

        const cursorRequest = {
          onsuccess: null,
          onerror: null,
          result: null,
        };

        function triggerStep() {
          if (localIndex < cursorValues.length) {
            // create new cursor for current index
            cursor = {
              key: cursorValues[localIndex].key,
              value: cursorValues[localIndex].value,
              continue: () => {
                localIndex++;
                cursorIndex++; // global position advances too
                triggerStep(); // continue to next item
              },
            };

            cursorRequest.result = cursor;
          } else {
            cursorRequest.result = null;
            
          }

          // simulate async cursor step
          setTimeout(() => {
            if (cursorRequest.onsuccess) {
              cursorRequest.onsuccess({ target: cursorRequest });
            }
          }, 0);
        }

        // trigger first step
        triggerStep();
        
        callCount++;
        return cursorRequest;
      });

      transactionMock.oncomplete = null;
      transactionMock.onerror = null;
      dbMock.transaction.mockImplementation(() => transactionMock);

      // Because the method is iterative, it will call openCursor multiple times,
      // so we advance timers enough to simulate all async setTimeout calls.
      const promise = storage.loadByKeyPrefixAsync("test");

      jest.advanceTimersByTime(10);

      // Trigger oncomplete multiple times simulating multiple transaction completions:
      // But your code calls transaction.oncomplete only once per batch,
      // so we call it each time the transaction is mocked (simulate batches)

      const triggerTransactionComplete = () => {
        if (transactionMock.oncomplete) transactionMock.oncomplete();
      };

      // Manually call transaction oncomplete a few times to simulate multiple batches
      // but since your batch size covers all, one time might suffice.
      setTimeout(triggerTransactionComplete, 50);

      jest.advanceTimersByTime(200);

      const results = await promise;

      expect(results).toEqual([{ a: 1 }, { a: 2 }, { a: 3 }]);
      expect(callCount).toBeGreaterThanOrEqual(1); // At least one openCursor call
    });

    test("methods throw if db not initialized", async () => {
      storage.db = undefined;
      await expect(storage.saveAsync("key", {})).rejects.toThrow(
        /DB not initialized/
      );
      await expect(storage.removeAsync("key")).rejects.toThrow(
        /DB not initialized/
      );
      await expect(storage.loadAsync("key")).rejects.toThrow(
        /DB not initialized/
      );
      await expect(storage.loadByKeyPrefixAsync("key")).rejects.toThrow(
        /DB not initialized/
      );
    });
  });
});
