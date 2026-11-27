const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const babel = require('@babel/core');
const compile = file => babel.transformSync(fs.readFileSync(path.resolve(__dirname, '../' + file), 'utf8'), { babelrc: false, configFile: false, presets: [['@babel/preset-react', { runtime: 'classic' }]], plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;

function pushFixture(oldChannel = { importance: 3, sound: 'default' }) {
  const channels = [], posts = [], state = { permission: 'granted', prompts: 0, prepared: 0, preparationFails: false };
  let handler;
  const notifications = {
    AndroidImportance: { NONE: 0, LOW: 2, DEFAULT: 3, HIGH: 4 }, AndroidNotificationVisibility: { PRIVATE: 0 },
    setNotificationChannelAsync: async (id, config) => channels.push([id, config]), getNotificationChannelAsync: async () => oldChannel,
    setNotificationHandler: value => { handler = value; }, getPermissionsAsync: async () => ({ status: state.permission }),
    requestPermissionsAsync: async () => { state.prompts++; return { status: state.permission }; },
    getExpoPushTokenAsync: async () => ({ data: 'ExpoPushToken[test-only]' }),
  };
  const mocks = {
    '@react-native-async-storage/async-storage': { setItem: async () => {} },
    'expo-constants': { easConfig: { projectId: 'test-project' } }, 'expo-device': { isDevice: true, brand: 'Test', modelName: 'Phone', osBuildId: 'TEST' },
    'expo-notifications': notifications, 'react-native': { Platform: { OS: 'android' }, NativeModules: { RentalHubIncomingCalls: { prepareNotifications: async () => { state.prepared++; if (state.preparationFails) throw Error('Protection is not ready'); return true; } } } },
    './api': { post: async (...args) => posts.push(args) },
  };
  const module = { exports: {} };
  vm.runInNewContext(compile('src/services/pushNotificationService.js'), { module, exports: module.exports, require: name => mocks[name] });
  return { service: module.exports, channels, posts, state, handler: () => handler };
}
test('new Android updates use a high-visibility private channel and registration advertises that capability', async () => {
  const f = pushFixture(); await f.service.registerForPushNotifications();
  assert.equal(f.state.prepared, 1);
  const channel = f.channels.find(([id]) => id === 'activity-v2')[1];
  assert.equal(channel.importance, 4); assert.equal(channel.showBadge, true); assert.equal(channel.lockscreenVisibility, 0); assert.equal(channel.bypassDnd, false);
  assert.ok(f.posts[0][1].device_id.endsWith(':incoming-v1'));
});
test('failed native account protection blocks device registration', async () => {
  const f = pushFixture(); f.state.preparationFails = true;
  await assert.rejects(f.service.registerForPushNotifications(), /Protection is not ready/);
  assert.equal(f.posts.length, 0);
});

test('a previously blocked or muted channel is not silently re-enabled', async () => {
  const f = pushFixture({ importance: 0, sound: null, enableVibrate: false }); await f.service.registerForPushNotifications();
  const channel = f.channels.find(([id]) => id === 'activity-v2')[1];
  assert.equal(channel.importance, 0); assert.equal(channel.sound, null); assert.equal(channel.enableVibrate, false);
});
test('foreground retries never reopen the permission prompt after a refusal', async () => {
  const f = pushFixture(); f.state.permission = 'denied';
  assert.equal((await f.service.registerForPushNotifications({ requestPermission: false })).reason, 'permission-denied');
  assert.equal(f.state.prompts, 0); assert.equal(f.posts.length, 0);
});
test('normal alerts keep banners and sound; call alerts do not acquire duplicate Expo alerts', async () => {
  const f = pushFixture(); f.service.configureNotificationPresentation();
  const present = data => f.handler().handleNotification({ request: { content: { data } } });
  const normal = await present({ type: 'property_posted' });
  assert.equal(normal.shouldPlaySound, true); assert.equal(normal.shouldShowBanner, true); assert.equal(normal.shouldSetBadge, true);
  const call = await present({ type: 'incoming_call' });
  assert.equal(call.shouldPlaySound, false); assert.equal(call.shouldShowBanner, false); assert.equal(call.shouldShowList, false); assert.equal(call.shouldSetBadge, false);
});

const clientRequire = createRequire(path.resolve(__dirname, '../../client/package.json'));
const { JSDOM } = clientRequire('jsdom');
const dom = new JSDOM('<html><body></body></html>');
global.window = dom.window; global.document = dom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true;
const React = clientRequire('react'), { createRoot } = clientRequire('react-dom/client'), h = React.createElement;

test('failed registration retries, refreshes a rotated token, and stops after logout', async () => {
  const AuthContext = React.createContext(null), registrations = [], timers = new Map();
  let timerId = 0, tokenListener, appListener, failures = 1;
  const mocks = {
    react: React, 'react-native': { AppState: { currentState: 'active', addEventListener: (_, fn) => { appListener = fn; return { remove() {} }; } }, Linking: {} },
    'expo-notifications': { addPushTokenListener: fn => { tokenListener = fn; return { remove() {} }; }, addNotificationResponseReceivedListener: () => ({ remove() {} }), addNotificationReceivedListener: () => ({ remove() {} }), getLastNotificationResponseAsync: async () => null },
    '../services/notificationService': { notificationService: {} }, '../navigation/navigationRef': {}, '../context/AuthContext': { AuthContext }, './AuthContext': { AuthContext },
    '../services/pushNotificationService': { configureNotificationPresentation() {}, registerForPushNotifications: async options => { registrations.push(options); if (failures-- > 0) throw Error('network unavailable'); return { success: true }; } },
    '../services/appBadgeService': { resetBadgeSession: async () => {}, syncAppIconBadge: async () => {}, subscribeBadgeSettings: () => () => {} },
  };
  const module = { exports: {} };
  vm.runInNewContext(compile('src/context/NotificationContext.js'), {
    module, exports: module.exports, require: name => { assert.ok(name in mocks, name); return mocks[name]; }, Date, Set,
    console: { warn() {} }, setInterval: () => 999, clearInterval() {},
    setTimeout: fn => { timers.set(++timerId, fn); return timerId; }, clearTimeout: id => timers.delete(id),
  });
  const root = createRoot(document.createElement('div'));
  const render = (signedIn, loading = false) => root.render(h(AuthContext.Provider, { value: { isAuthenticated: signedIn, user: signedIn ? { id: 2 } : null, loading } }, h(module.exports.NotificationProvider, null, 'App')));
  try {
    await React.act(async () => render(false, true)); assert.equal(registrations.length, 0);
    await React.act(async () => render(true)); assert.equal(registrations.length, 1); assert.equal(registrations[0].requestPermission, true);
    const retry = [...timers.values()][0]; await React.act(async () => retry());
    assert.equal(registrations.length, 2); assert.equal(registrations[1].requestPermission, false);
    await React.act(async () => tokenListener()); assert.equal(registrations.length, 3);
    await React.act(async () => appListener('active')); assert.equal(registrations.length, 3);
    await React.act(async () => render(false));
    await React.act(async () => tokenListener()); assert.equal(registrations.length, 3);
  } finally { await React.act(async () => root.unmount()); }
});

test('a cold notification tap waits for navigation, falls back safely, and stops if the session ends', async () => {
  const pending = new Map(), routes = [], reads = [], state = { ready: false, active: true };
  let next = 0;
  const mocks = {
    react: React, 'react-native': { Linking: { openURL: () => { throw Error('Unexpected external link'); } } },
    'expo-notifications': {}, './AuthContext': { AuthContext: React.createContext(null) },
    '../services/pushNotificationService': { configureNotificationPresentation() {} },
    '../services/notificationService': { notificationService: { markAsRead: async id => reads.push(id) } },
    '../services/appBadgeService': { syncAppIconBadge: async () => {} },
    '../navigation/navigationRef': {
      navigationRef: { isReady: () => state.ready },
      openNotificationDestination: data => { if (data.screen === 'Notifications') { routes.push('Notifications'); return true; } return false; },
      openRentalHubLinkInApp: link => { if (link === '/properties/42') { routes.push('PropertyDetail'); return true; } return false; },
    },
  };
  const module = { exports: {} };
  vm.runInNewContext(compile('src/context/NotificationContext.js'), {
    module, exports: module.exports, require: name => mocks[name], Set,
    setTimeout: fn => { pending.set(++next, fn); return next; },
  });
  const response = link => ({ notification: { request: { content: { data: { notificationId: '7', link } } } } });
  module.exports.openResponse(response('/properties/42'), { isActive: () => state.active, timers: new Set() });
  assert.equal(reads.length, 0); assert.equal(routes.length, 0);
  state.ready = true; [...pending.values()][0](); await Promise.resolve();
  assert.deepEqual(routes, ['PropertyDetail']); assert.deepEqual(reads, ['7']);
  module.exports.openResponse(response('/unknown-private-route'));
  assert.equal(routes.at(-1), 'Notifications');
  state.ready = false; pending.clear();
  module.exports.openResponse(response('/properties/42'), { isActive: () => state.active, timers: new Set() });
  state.active = false; state.ready = true;
  const count = reads.length; [...pending.values()][0](); assert.equal(reads.length, count);
});
