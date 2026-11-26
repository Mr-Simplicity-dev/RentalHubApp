const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const clientRequire = createRequire(path.resolve(__dirname, '../../client/package.json'));
const { JSDOM } = clientRequire('jsdom');
const dom = new JSDOM('<html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.IS_REACT_ACT_ENVIRONMENT = true;
const React = clientRequire('react');
const { createRoot } = clientRequire('react-dom/client');
const h = React.createElement;

async function fixture({ authenticated = true, receiverId = 2, authLoading = false } = {}) {
  const AuthContext = React.createContext(null), events = new Map(), calls = [];
  const call = { callId: 'test-call', receiver: { id: receiverId }, status: 'ringing', expiresAt: new Date(Date.now() + 40000).toISOString() };
  let answer = JSON.stringify({ callId: call.callId, receiverId: '2', expiresAt: call.expiresAt }), appStateListener;
  const native = {
    configure: (...args) => calls.push(['configure', ...args]), setForeground: active => calls.push(['foreground', active]),
    dismiss: id => calls.push(['dismiss', id]), consumeAnswer: async () => { const value = answer; answer = null; calls.push(['consume']); return value; },
  };
  const socket = { connected: false, on: (name, fn) => events.set(name, fn), off() {}, disconnect() {}, emit: (name, body, ack) => { calls.push(['emit', name, body]); ack?.({ success: true }); } };
  const mocks = {
    react: React, 'react-native': { AppState: { currentState: 'background', addEventListener: (_, fn) => { appStateListener = fn; return { remove() {} }; } }, NativeModules: { RentalHubIncomingCalls: native } },
    'expo-notifications': { addNotificationReceivedListener: () => ({ remove() {} }), addNotificationResponseReceivedListener: () => ({ remove() {} }), getPresentedNotificationsAsync: async () => [] },
    '../services/api': { __esModule: true, default: { get: async () => ({ data: { data: call } }) }, API_ORIGIN: 'https://example.test' },
    'socket.io-client': { io: () => socket }, '../services/storageService': { storageService: { getToken: async () => 'test-token' } }, './AuthContext': { AuthContext },
  };
  const module = { exports: {} };
  const code = require('@babel/core').transformSync(fs.readFileSync(path.resolve(__dirname, '../src/context/RealtimeContext.js'), 'utf8'), { babelrc: false, configFile: false, presets: [['@babel/preset-react', { runtime: 'classic' }]], plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
  vm.runInNewContext(code, { module, exports: module.exports, require: name => mocks[name], Date, Map, Set, Promise, setTimeout, clearTimeout });
  const node = document.createElement('div'), root = createRoot(node);
  const render = (signedIn, loading) => root.render(h(AuthContext.Provider, { value: { isAuthenticated: signedIn, user: signedIn ? { id: 2 } : null, loading } }, h(module.exports.RealtimeProvider, null, 'App')));
  await React.act(async () => render(authenticated, authLoading));
  return {
    calls, connect: async () => React.act(async () => { socket.connected = true; events.get('connect')?.(); }),
    restore: async () => React.act(async () => render(true, false)),
    foreground: async active => React.act(async () => appStateListener(active ? 'active' : 'background')),
    event: async name => React.act(async () => events.get(name)?.(call)),
    close: async () => React.act(async () => root.unmount()),
  };
}

test('Answer from another app rechecks ownership, accepts once and stops the native ringtone', async () => {
  const f = await fixture();
  try {
    await f.connect(); await f.foreground(true); await f.foreground(true);
    const accepts = f.calls.filter(item => item[0] === 'emit' && item[1] === 'call:accept');
    assert.equal(accepts.length, 1); assert.equal(accepts[0][2].callId, 'test-call');
    assert.ok(f.calls.some(item => item[0] === 'dismiss' && item[1] === 'test-call'));
    await f.foreground(false); assert.ok(f.calls.some(item => item[0] === 'foreground' && item[1] === false));
  } finally { await f.close(); }
});
test('a notification cannot answer another user’s call or a logged-out session', async () => {
  for (const options of [{ receiverId: 9 }, { authenticated: false }]) {
    const f = await fixture(options);
    try { await f.connect(); await f.foreground(true); assert.equal(f.calls.some(item => item[0] === 'emit'), false); }
    finally { await f.close(); }
  }
});
test('cold-start session restoration preserves a pending native Answer until the account is known', async () => {
  const f = await fixture({ authenticated: false, authLoading: true });
  try {
    assert.equal(f.calls.some(item => item[0] === 'configure'), false);
    await f.restore(); await f.connect();
    assert.equal(f.calls.filter(item => item[0] === 'emit' && item[1] === 'call:accept').length, 1);
  } finally { await f.close(); }
});
test('accepted, rejected, missed and ended events dismiss the matching native alert', async () => {
  const f = await fixture();
  try { for (const event of ['call:accepted', 'call:rejected', 'call:missed', 'call:ended']) await f.event(event); assert.equal(f.calls.filter(item => item[0] === 'dismiss').length, 4); }
  finally { await f.close(); }
});
test('Android background delivery has private actions, bounded OS ringing and no ordinary-push replacement', () => {
  const native = fs.readFileSync(path.resolve(__dirname, '../android/app/src/main/java/com/rentalhubng/RentalHubIncomingCalls.kt'), 'utf8');
  for (const required of ['Notification.FLAG_INSISTENT', '.setTimeoutAfter(', 'FLAG_IMMUTABLE', 'setShowWhenLocked(true)', 'super.onMessageReceived(message)', 'notification-${if (decline)', 'requestMethod = if (decline)', 'owns(c, data)', 'closed:', 'VISIBILITY_PRIVATE', '.setShowBadge(false)', '.setNumber(0)']) assert.ok(native.includes(required), required);
  assert.ok(!native.includes('setRingerMode')); assert.ok(!native.includes('setStreamVolume'));
});
