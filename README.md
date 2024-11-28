# wlvyr-common

A modular JavaScript library providing reusable components such as network resource handlers, queue consumers, encrypted storage, and offline-to-online synchronization orchestration.

## Installation

```sh
npm install --save @wlvyr/common
```

## Overview

- Network Resources: RestResource, AuthenticationResource, TokenAuthorizationService
- Security & Storage: PasswordCipher, IndexedDBStorage, EncryptedStorage.
- Queue Management: QueueConsumer for asynchronous queue processing.
- Synchronization: CommandSyncOrchestrator to sync offline actions with queues.

## Usage

### Resource

- `RestResource`
  - Provides convenience methods for common HTTP operations: GET, POST, PUT, and query by GET/POST.

  ```js
    import { RestResource } from '@wlvyr/common/network';

    let headers = {};
    const resource = new RestResource(
      'https://some-site.com',
      '/some-endpoint',
      undefined, // authService if resource requires authorization.
      headers
    );

    // can pass abortSignal, optional.
    const abortController = new AbortController();
    const abortSignal = abortController.signal;

    // GET /some-endpoint
    await resource.get(undefined, abortSignal);

    // GET /some-endpoint/1
    await resource.get(1, abortSignal);

    // POST //some-endpoint
    await resource.post({}, abortSignal);

    // PUT /some-endpoint/1
    await resource.put(1, {}, abortSignal);

    await resource.queryByPost({}, abortSignal);

    // GET /some-endpoint?q=1234&a=1
    await resource.queryByGet({q:"1234", a:1}, abortSignal);
  ```

- `TokenAuthorizationService`
  - Adding this in a `Resource` or `RestResource` allows it to send authorized requests.
  - Handles refresh token invocation automatically
    - on failed request, due to 401 code
      - will authenticate then try the request one last time
      - if it still fails, returns the 401 response to the client.

  1. Define and export `authenticationResource` object

      ```js
        import { AuthenticationResource } from '@wlvyr/common/network';

        let headers = { credentials: "include" }; // includes http-only cookie
        export const authenticationResource = new AuthenticationResource(
                        'https://some-site.com', 
                        'auth/refresh-token',
                        headers
                      )
      ```

  2. Pass `authenticationResource` into TokenAuthorizationService

      ```js
        import { TokenAuthService } from '@wlvyr/common/network';
        import { authenticationResource as reAuthenticationResource} from "." // from exported from above.

        let authExpirationInMs = 900000; // 15min, should follow server defined token expiration time.
        export const tokenAuthService = new TokenAuthorizationService(
          reAuthenticationResource, 
          authExpirationInMs
        );
      ```

  3. Pass `tokenAuthService` in project defined `Resource` or `RestResource`

- `AuthenticationResource`
  - has `AuthenticationResource.authenticate` signature
  - agnostic of authentication scheme
    - e.g. can be used for both credential authentication or refreshToken authentication.
  - not much different from `Resource`, except the added authenticate method.

  ```js
    import { AuthenticationResource } from '@wlvyr/common/network';

    // credentials valid values: "omit", "same-origin", "include". 
    // when identity is on a different domain, use 'include'.
    let headers = { credentials: "include" };  

    const authenticationResource = new AuthenticationResource(
                    'https://some-site.com', 
                    'auth/refresh-token',
                    headers
                  );

    // if refresh-token is in cookie
    await authenticationResource.authenticate();

    // if token is a js variable.
    await authenticationResource.authenticate(token);
  ```

- `Resource`
  - Represents a remote HTTP resource, providing utility methods to build and send HTTP requests.
  - meant to be extended but can be used as is for its utility methods.

  ```js
    import { Resource } from '@wlvyr/common/network';

    let headers = {};
    const resource = new Resource(
      'https://some-site.com',
      '/some-endpoint',
      undefined, // authService if resource requires authorization.
      headers
    );
  ```

- `timeout`
  - aborts a request after a specified duration

  ```js
    import { timeout } from "@wlvyr/common/network";

    timeout(abortController, timeInMs);
  ```

- `sanitizefetchException`
  - normalizes fetch exceptions into consistent public-facing responses:

  ```js
    import { sanitizefetchException } from "@wlvyr/common/network";

    let response = sanitizefetchException(exception);
  ```

### Ciphering

- `PasswordCipher`
  - Encryption/decryption using `libsodium-wrappers-sumo`. Use unique salt per user.
  
  ```js
  import { PasswordCipher } from "@wlvyr/common/security"

  var cipher = new PasswordCipher(password, salt);

  // encrypt object
  let encryptedAsString = await cipher.encryptAsync({});

  // decrypt object from encrypted string
  let decryptedObj = await cipher.decryptAsync(encryptedAsString);
  ```
  
  Example of generating or retrieving a persistent salt.

  ```js
  import sodium from "libsodium-wrappers-sumo";

  // key should probably be that contains context/app + userid or something.
  async function getOrCreateSaltAsync(key) {
    // Ensure libsodium is ready
    await sodium.ready;

    let base64Salt = localStorage.getItem(key);
    if (base64Salt) {
      return sodium.from_base64(base64Salt, sodium.base64_variants.ORIGINAL);
    }

    const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
    base64Salt = sodium.to_base64(salt, sodium.base64_variants.ORIGINAL);
    localStorage.setItem(key, base64Salt);

    return salt;
  }
  ```

- Using `ICipher`
  - can extend this class to create your own.

### Storage

- `IndexedDBStorage`
  - Offline storage implementation backed by IndexedDB.

  ```js
  import { IndexDBStorage } from "@wlvyr/common/storage";

  const dbVersion = 2; 
  const dbName = "some-name";
  const storeId ="some-store"; // storeid is like table
  const storage = new IndexedDBStorage(dbVersion, dbName, storeId);

  // ensure this is invoked first before saving or loading.
  // exception will be thrown otherwise.
  await storage.initializeStorageAsync();

  let key = "some-key";
  let objToStore = {}

  // save to storage
  await storage.saveAsync(key, objToStore);

  // get from storage
  objToStore = await storage.loadAsync(key);

  // remove from storage
  await storage.removeAsync(key);

  // get all from storage with key prefix.
  const items = await storage.loadByKeyPrefixAsync("key-prefix-");
  ```

- `EncryptedStorage`
  - decorator of `IStorage` that adds encryption/decryption capability.

  ```js
  import { EncryptedStorage, IndexDBStorage } from "@wlvyr/common/storage";
  import { PasswordCipher } from "@wlvyr/common/security";

  const indexedDbStorage = ... // see above.
  const passwordCipher = ... // see above.

  const encryptedStorage = new EncryptedStorage(passwordCipher, indexedDbStorage);

  // use encryptedStorage like any IStorage. see above.
  ```

### Queue Consumer

Manage asynchronous user action queues with retry policies and run conditions.

```js
import { QueueConsumer, RetryPolicyEvaluator, AttempNoRetryCondition, QueueCommand } from "@wlvyr/common/network";
import { UserCommand } from "@wlvyr/common";

const consumeFunc = (userCommand) => {
  // this can be dispatch (if using react)
  // or this can be an actual execution of command.

  // signifies done with command execution.
  // userCommand.onExecuted(true) // success
};

const runConditions = [
  () => navigator.online //Returns: true if the browser is connected to a network. not a sign of internet conectivity.
]

const retryPolicies = new RetryPolicyEvaluator([
  new AttempNoRetryCondition(3)
]);

const queueConsumer = new QueueConsumer(
  consumeFunc,
  runConditions,
  retryPolicies
);

let userCommand = new UserCommand("action-type", { /*payload*/ });
let queueCommand = new QueueCommand(userCommand); // Can listen for when a command is completed using onComplete, which returns a promise.


// start running the consumer
queueConsumer.start();

// enqueue a command
queueConsumer.enqueue(queueCommand);

// remove a command from queue
queueConsumer.remove(queueCommand);

// MANDATORY to invoke either userCommand.executed XOR queueConsumer.completedCommandExecution
// any code that uses userCommand.onExecute().then(()=>{}); will be notified upon invoking executed
userCommand.executed(success);

// similar to userCommand.executed but meant to be invoked in event-driven
// approach such as redux-thunk or RxJS. if userCommand.executed is used
// this will get invoked automatically.
queueConsumer.completedCommandExecution(queueCommand, success);

// stop the consumer.
queueConsumer.stop();

```

### ItemConsolidator

A simple wrapper, for clarity, that consolidates multiple objects into a new combined object without modifying the originals.

```js
import { ItemConsolidator } from "@wlvyr/common";

let itemConsolidator = new ItemConsolidator();

let obj1 = {};
let obj2 = {};

// get consolidated obj1 and obj2 into a new object. obj1 and obj2 are untouched.
let consolidatedItem = itemConsolidator.consolidate(obj1, obj2);

```

### CommandSyncOrchestrator

Synchronizes offline storage and queued commands.

```js
import { QueueConsumer } from "@wlvyr/common/async";
import { EncryptedStorage , IndexedDBStorage } from "@wlvyr/common/storage";
import { PasswordCipher } from "@wlvyr/common/security";
import { CommandSyncOrchestrator } from "@wlvyr/common/sync";
import { ItemConsolidator, UserCommand } from "@wlvyr/common";

let id = "unique-orchestrator-name";
let queueConsumer = ...; // see above on how it got instantiated.
let itemConsolidator = ...; // see above on how it got instantiated.

let encryptedStorage = ...; // see above how it got instantiated.

let syncOrchestrator = new CommandSyncOrchestrator(id, queueConsumer, itemConsolidator, encryptedStorage);

// loads queue from storage
await syncOrchestrator.initializeAsync();

// begin syncing
syncOrchestrator.start();

let userCommand = ...; // see above how it got instantiated.

// let userCommand get synced
await syncOrchestrator.handleCommand(userCommand);

// stop syncing
syncOrchestrator.stop();

// release resources
syncOrchestrator.dispose();
```

## Maintenance status

This project is maintained on a best-effort basis.<br>
Updates may be infrequent due to limited available time.<br>
Issues and feature requests are welcome, but responses and releases may take time.<br>
Pull requests are not currently accepted.

## License

This project is licensed under the MIT License.  
See [LICENSE](./LICENSE.txt) for full details.
