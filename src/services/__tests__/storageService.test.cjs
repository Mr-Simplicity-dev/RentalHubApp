const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const babel = require('@babel/core');
const transformModulesCommonJs = require('@babel/plugin-transform-modules-commonjs');

const TOKEN_SERVICE = 'com.rentalhubng.auth.token';
const SESSION_TOKEN_SERVICE = 'com.rentalhubng.auth.session-token';
const USER_SERVICE = 'com.rentalhubng.auth.user';
const IMPERSONATION_SERVICE =
  'com.rentalhubng.auth.impersonation-original';
const FALLBACK_PREFIX = 'rentalhub_secure_fallback:';

const sourcePath = path.resolve(
  __dirname,
  '..',
  'storageService.js'
);

const createAsyncStorage = (initial = {}) => {
  const values = new Map(Object.entries(initial));

  return {
    values,
    async getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    async setItem(key, value) {
      values.set(key, value);
    },
    async removeItem(key) {
      values.delete(key);
    },
    async multiSet(rows) {
      rows.forEach(([key, value]) => values.set(key, value));
    },
  };
};

const createKeychain = (initial = {}) => {
  const values = new Map(
    Object.entries(initial).map(([service, credentials]) => [
      service,
      { ...credentials },
    ])
  );

  return {
    values,
    failGet: false,
    failSet: false,
    resetFailures: new Set(),
    ACCESSIBLE: {
      WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'when-unlocked-device-only',
    },
    async getGenericPassword({ service }) {
      if (this.failGet) {
        throw new Error('Keychain read unavailable');
      }
      return values.get(service) || false;
    },
    async setGenericPassword(username, password, { service }) {
      if (this.failSet) {
        throw new Error('Keychain write unavailable');
      }
      values.set(service, { username, password });
      return true;
    },
    async resetGenericPassword({ service }) {
      if (this.resetFailures.has(service)) {
        throw new Error('Keychain reset unavailable');
      }
      values.delete(service);
      return true;
    },
  };
};

const loadStorageService = ({
  platform = 'android',
  asyncStorage = createAsyncStorage(),
  keychain = createKeychain(),
  keychainUnavailable = false,
} = {}) => {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const { code } = babel.transformSync(source, {
    babelrc: false,
    configFile: false,
    filename: sourcePath,
    plugins: [transformModulesCommonJs],
  });
  const module = { exports: {} };

  const localRequire = (request) => {
    if (request === '@react-native-async-storage/async-storage') {
      return { __esModule: true, default: asyncStorage };
    }
    if (request === 'react-native') {
      return { Platform: { OS: platform } };
    }
    if (request === 'react-native-keychain') {
      if (keychainUnavailable) {
        throw new Error('Native module is unavailable');
      }
      return keychain;
    }
    return require(request);
  };

  const evaluate = new Function('require', 'module', 'exports', code);
  evaluate(localRequire, module, module.exports);

  return {
    storageService: module.exports.storageService,
    asyncStorage,
    keychain,
  };
};

test('successful native writes keep auth secrets only in Keychain', async () => {
  const asyncStorage = createAsyncStorage({
    token: 'legacy-token',
    [`${FALLBACK_PREFIX}token`]: 'pending',
  });
  const keychain = createKeychain();
  const { storageService } = loadStorageService({
    asyncStorage,
    keychain,
  });

  await storageService.saveToken('new-token');

  assert.deepEqual(keychain.values.get(TOKEN_SERVICE), {
    username: 'token',
    password: 'new-token',
  });
  assert.equal(asyncStorage.values.has('token'), false);
  assert.equal(
    asyncStorage.values.has(`${FALLBACK_PREFIX}token`),
    false
  );
});

test('a Keychain failure uses a marked fallback and migrates it on recovery', async () => {
  const asyncStorage = createAsyncStorage();
  const keychain = createKeychain();
  keychain.failSet = true;
  const { storageService } = loadStorageService({
    asyncStorage,
    keychain,
  });

  await storageService.saveSessionToken('fallback-session');

  assert.equal(
    asyncStorage.values.get('session_token'),
    'fallback-session'
  );
  assert.equal(
    asyncStorage.values.get(`${FALLBACK_PREFIX}session_token`),
    'pending'
  );
  assert.equal(
    await storageService.getSessionToken(),
    'fallback-session'
  );

  keychain.failSet = false;
  assert.equal(
    await storageService.getSessionToken(),
    'fallback-session'
  );
  assert.deepEqual(keychain.values.get(SESSION_TOKEN_SERVICE), {
    username: 'session_token',
    password: 'fallback-session',
  });
  assert.equal(asyncStorage.values.has('session_token'), false);
});

test('legacy AsyncStorage values migrate to Keychain and are erased', async () => {
  const asyncStorage = createAsyncStorage({ token: 'legacy-token' });
  const keychain = createKeychain();
  const { storageService } = loadStorageService({
    asyncStorage,
    keychain,
  });

  assert.equal(await storageService.getToken(), 'legacy-token');
  assert.deepEqual(keychain.values.get(TOKEN_SERVICE), {
    username: 'token',
    password: 'legacy-token',
  });
  assert.equal(asyncStorage.values.has('token'), false);
});

test('a valid Keychain value wins and removes a stale plaintext copy', async () => {
  const asyncStorage = createAsyncStorage({ token: 'stale-token' });
  const keychain = createKeychain({
    [TOKEN_SERVICE]: {
      username: 'token',
      password: 'secure-token',
    },
  });
  const { storageService } = loadStorageService({
    asyncStorage,
    keychain,
  });

  assert.equal(await storageService.getToken(), 'secure-token');
  assert.equal(asyncStorage.values.has('token'), false);
});

test('legacy user credentials migrate without racing token hydration', async () => {
  const user = { id: 42, email: 'admin@rentalhub.com.ng' };
  const asyncStorage = createAsyncStorage({
    token: 'legacy-token',
    user: JSON.stringify(user),
  });
  const keychain = createKeychain({
    [TOKEN_SERVICE]: {
      username: 'user',
      password: JSON.stringify(user),
    },
  });
  const { storageService } = loadStorageService({
    asyncStorage,
    keychain,
  });

  const [token, storedUser] = await Promise.all([
    storageService.getToken(),
    storageService.getUser(),
  ]);

  assert.equal(token, 'legacy-token');
  assert.deepEqual(storedUser, user);
  assert.deepEqual(keychain.values.get(TOKEN_SERVICE), {
    username: 'token',
    password: 'legacy-token',
  });
  assert.deepEqual(keychain.values.get(USER_SERVICE), {
    username: 'user',
    password: JSON.stringify(user),
  });
  assert.equal(asyncStorage.values.has('token'), false);
  assert.equal(asyncStorage.values.has('user'), false);
});

test('impersonation sessions remain secure and clear independently', async () => {
  const originalSession = {
    token: 'admin-token',
    sessionToken: 'admin-session',
    user: { id: 1, user_type: 'super_admin' },
  };
  const { storageService, asyncStorage, keychain } =
    loadStorageService();

  await storageService.saveImpersonationSession(originalSession);

  assert.deepEqual(
    await storageService.getImpersonationSession(),
    originalSession
  );
  assert.equal(
    asyncStorage.values.has('impersonation_original_session'),
    false
  );

  await storageService.clearImpersonationSession();

  assert.equal(
    keychain.values.has(IMPERSONATION_SERVICE),
    false
  );
  assert.equal(
    await storageService.getImpersonationSession(),
    null
  );
});

test('clearAll continues clearing other records if one Keychain reset fails', async () => {
  const asyncStorage = createAsyncStorage({
    token: 'fallback-token',
    session_token: 'fallback-session',
    user: '{"id":1}',
    impersonation_original_session: '{"token":"original"}',
  });
  const keychain = createKeychain({
    [TOKEN_SERVICE]: { username: 'token', password: 'token' },
    [SESSION_TOKEN_SERVICE]: {
      username: 'session_token',
      password: 'session',
    },
    [USER_SERVICE]: { username: 'user', password: '{"id":1}' },
    [IMPERSONATION_SERVICE]: {
      username: 'original_session',
      password: '{"token":"original"}',
    },
  });
  keychain.resetFailures.add(TOKEN_SERVICE);
  const { storageService } = loadStorageService({
    asyncStorage,
    keychain,
  });

  await storageService.clearAll();

  assert.equal(keychain.values.has(TOKEN_SERVICE), true);
  assert.equal(keychain.values.has(SESSION_TOKEN_SERVICE), false);
  assert.equal(keychain.values.has(USER_SERVICE), false);
  assert.equal(keychain.values.has(IMPERSONATION_SERVICE), false);
  assert.equal(asyncStorage.values.size, 0);
});

test('web keeps the existing AsyncStorage fallback behavior', async () => {
  const asyncStorage = createAsyncStorage();
  const { storageService } = loadStorageService({
    platform: 'web',
    asyncStorage,
    keychainUnavailable: true,
  });

  await storageService.saveToken('web-token');
  await storageService.saveUser({ id: 7 });

  assert.equal(await storageService.getToken(), 'web-token');
  assert.deepEqual(await storageService.getUser(), { id: 7 });
  assert.equal(
    asyncStorage.values.has(`${FALLBACK_PREFIX}token`),
    false
  );
});
