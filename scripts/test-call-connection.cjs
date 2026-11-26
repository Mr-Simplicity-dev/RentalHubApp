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

const nativeInitializer = () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/components/calls/NativeCallOverlay.js'), 'utf8');
  const ast = transformSync(source, { ast: true, code: false, configFile: false, babelrc: false, parserOpts: { plugins: ['jsx'] } }).ast;
  let fn;
  const visit = node => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'VariableDeclarator' && node.id?.name === 'beginMediaCall') fn = node.init.arguments[0];
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  };
  visit(ast); assert.ok(fn);
  const state = { peers: 0, offers: 0, stopped: 0, captures: 0 };
  let release;
  const media = new Promise(resolve => { release = resolve; });
  const track = { enabled: true, stop: () => { state.stopped++; } };
  const stream = { getTracks: () => [track], getAudioTracks: () => [track], getVideoTracks: () => [] };
  const context = {
    Promise, Error, peerRef: { current: null }, mediaInitPromiseRef: { current: null }, mediaGenerationRef: { current: 0 },
    localStreamRef: { current: null },
    isVideoEnabledCall: type => type === 'video' || type === 'virtual_tour',
    setMediaStatus() {}, setLocalStream() {}, setMicrophoneEnabled() {}, setCameraEnabled() {},
    loadWebRtcIceServers: async () => [{ urls: 'turn:relay:3478' }],
    RTCPeerConnection: function () {},
    mediaDevices: { getUserMedia: async () => { state.captures++; await media; return stream; } },
    createPeerConnection: () => { state.peers++; return { addTrack() {}, createOffer: async () => ({ type: 'offer' }), setLocalDescription: async () => {} }; },
    emitCallSignal: async () => { state.offers++; }, cleanupMedia() {}, Toast: { show() {} }, ui: v => v, endCall: async () => {},
  };
  return { begin: vm.runInNewContext('('+source.slice(fn.start, fn.end)+')', context), context, state, release };
};

test('an offer arriving while the native microphone opens waits for the same initialization', async () => {
  for (const callType of ['audio', 'video', 'virtual_tour']) {
    const app = nativeInitializer(); const call = { callId: 'accepted-call', callType };
    const started = app.begin(call, { initiator: true });
    await Promise.resolve();
    const overlapping = app.begin(call, { initiator: false });
    assert.equal(started, overlapping);
    app.release(); const [one, two] = await Promise.all([started, overlapping]);
    assert.ok(one); assert.equal(one, two); assert.equal(app.state.peers, 1); assert.equal(app.state.captures, 1); assert.equal(app.state.offers, 1);
  }
});

test('hanging up while native microphone permission is pending stops late tracks', async () => {
  const app = nativeInitializer();
  const started = app.begin({ callId: 'cancelled', callType: 'audio' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.state.captures, 1);
  app.context.mediaGenerationRef.current++;
  app.release(); assert.equal(await started, null);
  assert.equal(app.state.stopped, 1); assert.equal(app.state.peers, 0);
});
