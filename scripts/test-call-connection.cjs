const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { transformSync } = require('@babel/core');
const { createCallSignalBuffer } = require('../src/utils/callSignalBuffer.cjs');
const Candidate = class { constructor(value) { Object.assign(this, value); } };

test('early candidates wait for the peer and remote description, then are applied in order', async () => {
  const buffer = createCallSignalBuffer();
  buffer.add('call-a', { candidate: 'first' });
  buffer.add('call-a', { candidate: 'second' });
  await buffer.drain('call-a', null, Candidate);
  const applied = [];
  const peer = { remoteDescription: null, addIceCandidate: async c => applied.push(c.candidate) };
  await buffer.drain('call-a', peer, Candidate);
  assert.deepEqual(applied, []);
  peer.remoteDescription = { type: 'offer' };
  await buffer.drain('call-a', peer, Candidate);
  assert.deepEqual(applied, ['first', 'second']);
});

test('simultaneous drains and newly arriving candidates are applied once', async () => {
  const buffer = createCallSignalBuffer();
  const applied = [];
  let release;
  const blocked = new Promise(resolve => { release = resolve; });
  const peer = { remoteDescription: { type: 'answer' }, addIceCandidate: async c => {
    applied.push(c.candidate); if (c.candidate === 'first') await blocked;
  } };
  buffer.add('call-a', { candidate: 'first' });
  const one = buffer.drain('call-a', peer, Candidate);
  buffer.add('call-a', { candidate: 'second' });
  const two = buffer.drain('call-a', peer, Candidate);
  assert.equal(one, two);
  release(); await Promise.all([one, two]);
  assert.deepEqual(applied, ['first', 'second']);
});

test('call ids and ended-call cleanup keep candidates away from another call', async () => {
  const buffer = createCallSignalBuffer();
  const applied = [];
  const peer = { remoteDescription: { type: 'offer' }, addIceCandidate: async c => applied.push(c.candidate) };
  buffer.add('old', { candidate: 'old' });
  await buffer.drain('new', peer, Candidate);
  buffer.clear(); await buffer.drain('old', peer, Candidate);
  assert.deepEqual(applied, []);
});

const loadConfig = (get) => {
  const filename = path.join(__dirname, '../src/config/webrtcConfig.js');
  const code = transformSync(fs.readFileSync(filename, 'utf8'), {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: name => {
    if (name === '../services/api') return { get };
    if (name === 'react-native') return { Platform: { OS: 'android' } };
    throw Error('Unexpected import '+name);
  } });
  return module.exports;
};

test('app requests authenticated runtime relay settings instead of bundled passwords', async () => {
  const servers = [{ urls: ['turn:relay.example:3478?transport=tcp'], username: 'short', credential: 'lived' }];
  const config = loadConfig(async (url, options) => {
    assert.equal(url, '/voice/ice-servers'); assert.equal(options.timeout, 12000);
    return { data: { success: true, data: servers } };
  });
  assert.equal(await config.loadWebRtcIceServers(), servers);
});

test('missing relay, API failure and invalid settings stop with an error', async () => {
  for (const payload of [{ success: true, data: [{ urls: 'stun:example' }] }, { success: false }, { success: true, data: null }]) {
    await assert.rejects(loadConfig(async () => ({ data: payload })).loadWebRtcIceServers(), /unavailable/);
  }
  await assert.rejects(loadConfig(async () => { throw Error('Network unavailable'); }).loadWebRtcIceServers(), /Network unavailable/);
});

const overlaySource = fs.readFileSync(path.join(__dirname, '../src/components/calls/NativeCallOverlay.js'), 'utf8');

test('the native overlay delegates signalling to the shared media controller', () => {
  assert.match(overlaySource, /createNativeCallMedia\(/);
  assert.match(overlaySource, /media\.start\(call/);
  assert.match(overlaySource, /media\.handleOffer\(/);
  assert.match(overlaySource, /media\.handleAnswer\(/);
  assert.match(overlaySource, /media\.handleIce\(/);
  assert.match(overlaySource, /subscribe\('call:signal:offer'/);
  assert.match(overlaySource, /subscribe\('call:signal:answer'/);
  assert.match(overlaySource, /subscribe\('call:signal:ice-candidate'/);
});

test('the native overlay keeps controls accessible and respects device edges', () => {
  assert.match(overlaySource, /useSafeAreaInsets\(\)/);
  assert.match(overlaySource, /useWindowDimensions\(\)/);
  assert.match(overlaySource, /accessibilityRole="button"/);
  assert.match(overlaySource, /accessibilityState=/);
  assert.match(overlaySource, /ScreenCapturePickerView/);
  assert.match(overlaySource, /Platform\.OS === 'ios'/);
  assert.match(overlaySource, /media\.setAudioRoute\(route\)/);
  assert.match(overlaySource, /media\.cancelScreenShare\(\)/);
});
