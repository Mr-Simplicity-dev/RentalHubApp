const fs = require('fs');
const assert = require('assert/strict');
const vm = require('vm');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const source = fs.readFileSync('src/components/common/AppUpdateIndicator.js', 'utf8');
let effect;
traverse(parser.parse(source, { sourceType: 'module', plugins: ['jsx'] }), {
  CallExpression(path) {
    if (path.node.callee.name !== 'useEffect') return;
    const callback = path.node.arguments[0];
    const code = source.slice(callback.start, callback.end);
    if (code.includes('let previousAppState')) effect = code;
  },
});
assert.ok(effect);
let listener, calls = 0, fail = false, state, removed = false;
const timers = new Map(); let id = 0;
const context = {
  AppState: { currentState: 'active', addEventListener: (_, fn) => { listener = fn; return { remove: () => { removed = true; } }; } },
  CHECK_DELAY_MS: 4200, CHECK_INTERVAL_MS: 14400000, RETRY_DELAY_MS: 60000,
  setTimeout: (fn, delay) => { timers.set(++id, { fn, delay }); return id; },
  clearTimeout: key => timers.delete(key),
  setInterval: () => ++id, clearInterval: () => {},
  checkForAppUpdate: async () => { calls++; if (fail) throw Error('offline'); return { update_available: true, latest_version: '1.0.54' }; },
  setVersionState: value => { state = value; }, setDismissed: () => {},
  latestOfferedVersion: { current: null }, cancelUpdateNotification: async () => {},
};
const flush = () => new Promise(resolve => setImmediate(resolve));
(async () => {
  const cleanup = vm.runInNewContext(`(${effect})()`, context);
  [...timers.values()].find(timer => timer.delay === 4200).fn(); await flush();
  assert.equal(calls, 1); assert.equal(state.latest_version, '1.0.54');
  listener('background'); listener('active'); listener('active'); await flush();
  assert.equal(calls, 2, 'one recheck on resume');
  fail = true; listener('background'); listener('active'); await flush();
  const retry = [...timers.values()].find(timer => timer.delay === 60000);
  assert.ok(retry, 'connection failure retries after a minute');
  fail = false; retry.fn(); await flush();
  assert.equal(state.latest_version, '1.0.54');
  cleanup(); assert.ok(removed); assert.equal(timers.size, 0);
  listener('background'); listener('active'); await flush(); assert.equal(calls, 4);
  console.log('PASS: startup check, resume recheck, duplicate suppression, network retry and unmount cleanup.');
})().catch(error => { console.error(error); process.exitCode = 1; });
