const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const babel = require('@babel/core');
const transformModulesCommonJs = require('@babel/plugin-transform-modules-commonjs');

const SERVICE = 'com.rentalhubng.support.guest-tickets';
const FALLBACK_KEY = 'rentalhub_guest_support_credentials_v1';
const PENDING_KEY = `${FALLBACK_KEY}:pending`;
const TOKEN = `rhg_${'a'.repeat(43)}`;
const sourcePath = path.resolve(__dirname, '..', 'guestSupportCredentialService.js');

const createAsyncStorage = () => {
  const values = new Map();
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
    async multiRemove(keys) {
      keys.forEach((key) => values.delete(key));
    },
  };
};

const createKeychain = () => {
  const values = new Map();
  return {
    values,
    failSet: false,
    ACCESSIBLE: {
      WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'when-unlocked-device-only',
    },
    async getGenericPassword({ service }) {
      return values.get(service) || false;
    },
    async setGenericPassword(username, password, { service }) {
      if (this.failSet) throw new Error('Keychain write unavailable');
      values.set(service, { username, password });
      return true;
    },
    async resetGenericPassword({ service }) {
      values.delete(service);
      return true;
    },
  };
};

const loadService = () => {
  const asyncStorage = createAsyncStorage();
  const keychain = createKeychain();
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
    if (request === 'react-native') return { Platform: { OS: 'android' } };
    if (request === 'react-native-keychain') return keychain;
    return require(request);
  };
  new Function('require', 'module', 'exports', code)(
    localRequire,
    module,
    module.exports
  );
  return {
    service: module.exports.guestSupportCredentialService,
    asyncStorage,
    keychain,
  };
};

test('guest support credentials are ticket-scoped and stored in Keychain', async () => {
  const { service, asyncStorage, keychain } = loadService();

  assert.equal(await service.save({
    ticketId: 42,
    guestAccessToken: TOKEN,
    email: ' Guest@Example.com ',
  }), true);

  assert.deepEqual(await service.get(42), {
    ticketId: 42,
    guestAccessToken: TOKEN,
    email: 'guest@example.com',
    savedAt: (await service.get(42)).savedAt,
  });
  assert.equal(keychain.values.has(SERVICE), true);
  assert.equal(asyncStorage.values.has(FALLBACK_KEY), false);
});

test('a failed Keychain write keeps an authoritative fallback and migrates it later', async () => {
  const { service, asyncStorage, keychain } = loadService();
  keychain.failSet = true;

  assert.equal(await service.save({
    ticketId: 8,
    guestAccessToken: TOKEN,
    email: 'guest@example.com',
  }), true);
  assert.equal(asyncStorage.values.get(PENDING_KEY), 'true');

  keychain.failSet = false;
  assert.equal((await service.get(8)).guestAccessToken, TOKEN);
  assert.equal(keychain.values.has(SERVICE), true);
  assert.equal(asyncStorage.values.has(PENDING_KEY), false);
});

test('malformed guest support credentials are rejected', async () => {
  const { service } = loadService();
  assert.equal(await service.save({
    ticketId: 9,
    guestAccessToken: 'invalid',
    email: 'guest@example.com',
  }), false);
});
