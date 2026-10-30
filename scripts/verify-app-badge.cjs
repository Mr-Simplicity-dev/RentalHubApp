const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { transformSync } = require('@babel/core');

const code = transformSync(fs.readFileSync('src/services/appBadgeService.js', 'utf8'), {
  configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
}).code;

function setup(os = 'android', supported = true) {
  const calls = { badges: [], summaries: [], dismissed: [] };
  const state = { total: 10, disabled: false };
  const notifications = {
    AndroidImportance: { LOW: 2 },
    setNotificationChannelAsync: async () => {},
    getPermissionsAsync: async () => ({ granted: true }),
    scheduleNotificationAsync: async value => calls.summaries.push(value),
    dismissNotificationAsync: async id => calls.dismissed.push(id),
    cancelScheduledNotificationAsync: async () => {},
    setBadgeCountAsync: async value => { calls.badges.push(value); return supported; },
  };
  const service = {
    getUnreadActivity: async () => ({ data: { total: state.total } }),
    getUnreadCount: async () => ({ data: { count: state.total } }),
  };
  const modules = {
    '../i18n/interfaceRuntime.cjs': { translateUi: value => value },
    'react-native': { Platform: { OS: os } },
    'expo-notifications': notifications,
    './notificationService': { notificationService: service },
    './messageService': { messageService: { getUnreadCount: async () => { throw Error('offline'); } } },
    './appSettingsService': {
      getAppSettings: async () => ({ notificationBadges: !state.disabled }),
      subscribeAppSettings: () => () => {},
    },
    './mobileDiagnosticsService': { trackMobileEvent: () => {} },
  };
  const context = { exports: {}, require: name => {
    assert.ok(modules[name], name);
    return modules[name];
  } };
  vm.runInNewContext(code, context);
  return { api: context.exports, calls, state, service };
}

(async () => {
  for (const [os, supported] of [['android', true], ['android', false], ['ios', true]]) {
    const { api, calls, state } = setup(os, supported);
    await api.syncAppIconBadge();
    state.total = 9;
    await api.syncAppIconBadge();
    state.total = 0;
    await api.syncAppIconBadge();
    assert.deepEqual(calls.badges, [10, 9, 0]);
    assert.deepEqual(calls.summaries.map(item => item.content.badge), os === 'android' ? [10, 9] : []);
    if (os === 'android') assert.ok(calls.dismissed.includes('rentalhub-unread-summary'));
    state.disabled = true;
    state.total = 12;
    await api.syncAppIconBadge();
    assert.equal(calls.badges.at(-1), 0);
  }
  {
    const { api, calls, service } = setup();
    await api.syncAppIconBadge();
    service.getUnreadActivity = async () => { throw Error('offline'); };
    await assert.rejects(api.syncAppIconBadge(), /Unread counts unavailable/);
    assert.deepEqual(calls.badges, [10]);
  }
  for (const logout of [false, true]) {
    const { api, calls, service } = setup();
    let resolve;
    let started;
    const ready = new Promise(done => { started = done; });
    service.getUnreadActivity = () => new Promise(done => { resolve = done; started(); });
    const old = api.syncAppIconBadge();
    await ready;
    if (logout) await api.resetBadgeSession();
    else {
      service.getUnreadActivity = async () => ({ data: { total: 9 } });
      await api.syncAppIconBadge();
    }
    resolve({ data: { total: 10 } });
    assert.equal((await old).stale, true);
    assert.deepEqual(calls.badges, [logout ? 0 : 9]);
  }
  console.log('Badge checks passed: Android numbers/dot fallback, iOS, 10 → 9 → 0, disabled badges, partial outages, overlapping refreshes and logout.');
})().catch(error => { console.error(error); process.exitCode = 1; });
