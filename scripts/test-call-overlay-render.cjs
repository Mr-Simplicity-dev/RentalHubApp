const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { transformSync } = require('@babel/core');

function loadOverlay(os, routes = { added: 0, removed: 0 }, activeCall = null) {
  const cache = new Map();
  const noop = () => {};
  const native = {
    Platform: { OS: os, select: values => values[os] ?? values.default },
    NativeModules: { RentalHubAudioRoute: {} },
    NativeEventEmitter: class { addListener() { routes.added++; let removed = false; return { remove() { if (!removed) { removed = true; routes.removed++; } } }; } },
    AppState: { currentState: 'active', addEventListener: () => ({ remove: noop }) },
    StyleSheet: { create: value => value, absoluteFillObject: {} },
    useWindowDimensions: () => ({ width: 390, height: 844 }),
    ActivityIndicator: 'span', Modal: 'div', TouchableOpacity: 'button', View: 'div',
  };
  const auth = React.createContext({ user: { id: 123 } });
  function load(relative) {
    const filename = path.resolve(__dirname, '..', relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const code = transformSync(fs.readFileSync(filename, 'utf8'), {
      filename, configFile: false, babelrc: false,
      plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
    }).code;
    const get = name => {
      if (name === 'react') return React;
      if (name === 'react-native') return native;
      if (name === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) };
      if (name === 'react-native-webrtc') return {};
      if (name === 'react-native-vector-icons/Ionicons') return () => null;
      if (name === 'react-native-toast-message') return { show: noop };
      if (name.endsWith('/hooks/useCallSounds')) return load('src/hooks/useCallSounds.js');
      if (name.endsWith('/utils/callSoundSession.cjs')) return require('../src/utils/callSoundSession.cjs');
      if (name.endsWith('/services/callSoundService')) return { loadCallSounds: async () => ({}), playCallSound: async () => ({ stop: noop }) };
      if (name.endsWith('/context/AuthContext')) return { AuthContext: auth };
      if (name.endsWith('/context/RealtimeContext')) return { useRealtime: () => ({ activeCall, subscribe: () => noop }) };
      if (name.endsWith('/services/nativeCallMediaService')) return { createNativeCallMedia: () => ({ stop: async () => {} }) };
      if (name.endsWith('/services/nativeAudioRouteService')) return load('src/services/nativeAudioRouteService.js');
      if (name.endsWith('/services/voiceMonitorService')) return { voiceMonitorService: { myCallRoomHistory: async () => ({ data: [] }) } };
      if (name.endsWith('/common/UserAvatar')) return ({ user }) => React.createElement('span', null, `avatar:${user?.full_name || ''}`);
      if (name.endsWith('/brand/BrandLogoMark')) return () => React.createElement('span', null, 'Amana logo');
      if (name.endsWith('/i18n/interfaceRuntime.cjs')) return { translateUi: value => value };
      if (name.endsWith('/i18n/useInterfaceLanguage')) return noop;
      if (name.endsWith('/theme')) return load('src/theme/index.js');
      if (name.endsWith('/common/AppTextInput')) return () => null;
      if (name.endsWith('/common/AppText')) return ({ children }) => React.createElement('span', null, children);
      throw Error('Unexpected overlay dependency: ' + name);
    };
    vm.runInNewContext(code, { module, exports: module.exports, require: get, console, setTimeout, clearTimeout }, { filename });
    return module.exports;
  }
  return load('src/components/calls/NativeCallOverlay.js').default;
}

for (const os of ['android', 'ios']) {
  test(`signed-in ${os} app renders the idle call screen with the real ringtone-hook exports`, () => {
    const Overlay = loadOverlay(os);
    assert.equal(renderToStaticMarkup(React.createElement(Overlay)), '');
  });
}

test('the real call overlay mounts and releases its audio-route subscription with the current native event API', async () => {
  const { createRequire } = require('module');
  const clientRequire = createRequire(path.resolve(__dirname, '../../client/package.json'));
  const { JSDOM } = clientRequire('jsdom');
  const dom = new JSDOM('<html><body></body></html>');
  global.window = dom.window; global.document = dom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true;
  const { createRoot } = require('react-dom/client');
  const routes = { added: 0, removed: 0 }, Overlay = loadOverlay('android', routes);
  const root = createRoot(document.createElement('div'));
  try { await React.act(async () => root.render(React.createElement(Overlay))); assert.equal(routes.added, 1); }
  finally { await React.act(async () => root.unmount()); dom.window.close(); }
  assert.equal(routes.removed, 1);
});

test('incoming call overlay shows the caller department, role, ID and Amana brand', () => {
  const Overlay = loadOverlay('android', undefined, {
    callId: 'identity-call',
    callType: 'audio',
    direction: 'incoming',
    status: 'ringing',
    caller: {
      id: 41,
      full_name: 'Ada Lawyer',
      call_display_name: 'Ada Lawyer',
      call_display_detail: 'National Super Lawyer · Legal Department · ID 41',
      call_display_kind: 'brand',
    },
  });
  const html = renderToStaticMarkup(React.createElement(Overlay));
  assert.match(html, /Amana logo/);
  assert.match(html, /Ada Lawyer/);
  assert.match(html, /National Super Lawyer · Legal Department · ID 41/);
});

test('incoming call overlay uses the caller profile avatar when the call is not department-branded', () => {
  const Overlay = loadOverlay('android', undefined, {
    callId: 'person-call',
    callType: 'audio',
    direction: 'incoming',
    status: 'ringing',
    caller: {
      id: 51,
      full_name: 'John Tenant',
      call_display_name: 'John Tenant',
      call_display_detail: 'Tenant',
      call_display_kind: 'person',
    },
  });
  const html = renderToStaticMarkup(React.createElement(Overlay));
  assert.match(html, /avatar:John Tenant/);
  assert.match(html, /John Tenant/);
});
