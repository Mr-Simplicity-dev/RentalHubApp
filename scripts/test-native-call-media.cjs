const test = require('node:test');
const assert = require('node:assert/strict');
const { createNativeCallMediaController, INITIAL_STATE } = require('../src/utils/nativeCallMediaController.cjs');

const createTrack = (kind, extra = {}) => ({
  kind,
  enabled: true,
  readyState: 'live',
  stopCount: 0,
  listeners: {},
  stop() { this.stopCount += 1; this.readyState = 'ended'; },
  addEventListener(name, handler) { this.listeners[name] = handler; },
  removeEventListener(name) { delete this.listeners[name]; },
  emit(name) { this.listeners[name]?.(); },
  ...extra,
});

const createStream = (tracks = []) => ({
  getTracks: () => tracks,
  getAudioTracks: () => tracks.filter((track) => track.kind === 'audio'),
  getVideoTracks: () => tracks.filter((track) => track.kind === 'video'),
});

const createHarness = (options = {}) => {
  const emitted = [];
  const states = [];
  const calls = { userMedia: [], displayMedia: 0, picker: 0, switch: 0, routeRestore: 0 };
  const audioTrack = createTrack('audio');
  const cameraTrack = createTrack('video', {
    _switchCamera() { calls.switch += 1; },
  });
  const screenTrack = createTrack('video');
  const peer = {
    signalingState: 'stable',
    connectionState: 'new',
    remoteDescription: null,
    localDescription: null,
    senders: [],
    transceivers: [],
    addTrack(track) { calls.userMedia.push({ addTrack: track.kind }); },
    addTransceiver(kind, init = {}) {
      const transceiver = {
        direction: init.direction || 'sendrecv',
        sender: {
          track: null,
          replaceTrack: async (track) => { transceiver.sender.track = track; },
        },
        receiver: { track: createTrack(kind) },
      };
      this.transceivers.push(transceiver);
      return transceiver;
    },
    async createOffer() { return { type: 'offer', sdp: 'offer-sdp' }; },
    async createAnswer() { return { type: 'answer', sdp: 'answer-sdp' }; },
    async setLocalDescription(desc) { this.localDescription = desc; },
    async setRemoteDescription(desc) {
      if (desc.type === 'rollback') { this.remoteDescription = null; this.signalingState = 'stable'; return; }
      this.remoteDescription = desc;
      this.signalingState = desc.type === 'offer' ? 'have-remote-offer' : 'stable';
    },
    async addIceCandidate() {},
    close() { this.connectionState = 'closed'; },
  };
  let resolveCamera;
  let resolveInitial;
  let resolveDisplay;
  const pendingCamera = new Promise((resolve) => { resolveCamera = resolve; });
  const pendingInitial = new Promise((resolve) => { resolveInitial = resolve; });
  const pendingDisplay = new Promise((resolve) => { resolveDisplay = resolve; });
  const mediaDevices = {
    getUserMedia: async (constraints) => {
      calls.userMedia.push({ constraints });
      if (options.pendingInitialMedia && constraints.audio) {
        await pendingInitial;
        return createStream(constraints.video ? [audioTrack, cameraTrack] : [audioTrack]);
      }
      if (options.pendingCamera && constraints.video && !constraints.audio) {
        await pendingCamera;
        return createStream([cameraTrack]);
      }
      const tracks = [audioTrack];
      if (constraints.video) tracks.push(cameraTrack);
      return createStream(tracks);
    },
    getDisplayMedia: async () => {
      calls.displayMedia += 1;
      if (options.pendingDisplayMedia) await pendingDisplay;
      if (options.denyScreen) {
        const error = new Error('NotAllowedError');
        error.name = 'NotAllowedError';
        throw error;
      }
      return createStream([screenTrack]);
    },
  };
  const audioRoute = {
    getState: async () => ({ route: 'earpiece', available: ['earpiece', 'speaker'], supported: true }),
    setRoute: async (route) => ({ route, available: ['earpiece', 'speaker', route], supported: true }),
    restore: async () => { calls.routeRestore += 1; },
  };
  const controller = createNativeCallMediaController({
    mediaDevices,
    RTCPeerConnection: function RTCPeerConnection() { return peer; },
    RTCSessionDescription: class RTCSessionDescription { constructor(value) { Object.assign(this, value); } },
    RTCIceCandidate: class RTCIceCandidate { constructor(value) { Object.assign(this, value); } },
    loadIceServers: async () => [{ urls: 'turn:relay:3478' }],
    emitSignal: async (event, payload) => { emitted.push({ event, payload }); },
    presentScreenPicker: async () => { calls.picker += 1; },
    getAudioConstraints: () => ({ googEchoCancellation: true, googNoiseSuppression: true, googAutoGainControl: true }),
    getVideoConstraints: (facingMode) => ({ facingMode }),
    audioRoute,
    onState: (state) => states.push({ ...state }),
  });
  return { controller, peer, audioTrack, cameraTrack, screenTrack, emitted, states, calls, resolveCamera, resolveInitial, resolveDisplay };
};

const settle = () => new Promise((resolve) => setImmediate(resolve));

test('A/B: audio calls start audio-only and video calls start with a video sender', async () => {
  for (const callType of ['audio', 'video', 'virtual_tour']) {
    const h = createHarness();
    await h.controller.start({ callId: 'call-1', callType, direction: 'outgoing' }, { initiator: true });
    const videoExpected = callType !== 'audio';
    assert.equal(h.peer.transceivers.length, videoExpected ? 1 : 0, callType);
    if (videoExpected) assert.equal(h.peer.transceivers[0].direction, 'sendrecv');
    assert.equal(h.calls.userMedia[0].constraints.audio.googNoiseSuppression, true);
    assert.equal(h.emitted.filter((item) => item.event === 'call:signal:offer').length, 1);
  }
});

test('C/D: an audio call can upgrade to video and downgrade without a new peer', async () => {
  const h = createHarness();
  const firstPeer = await h.controller.start({ callId: 'call-2', callType: 'audio', direction: 'outgoing' }, { initiator: true });
  await h.controller.setVideoEnabled(true);
  assert.equal(h.peer.transceivers.length, 1);
  assert.equal(h.peer.transceivers[0].sender.track, h.cameraTrack);
  assert.equal(h.peer.transceivers[0].direction, 'sendrecv');
  assert.equal(h.controller.getState().videoEnabled, true);
  assert.equal(h.controller.getPeer(), firstPeer);
  await h.controller.setVideoEnabled(false);
  assert.equal(h.cameraTrack.stopCount, 1);
  assert.equal(h.peer.transceivers[0].sender.track, null);
  assert.equal(h.peer.transceivers[0].direction, 'inactive');
  assert.equal(h.controller.getState().videoEnabled, false);
  assert.ok(h.emitted.filter((item) => item.event === 'call:signal:offer').length >= 3);
});

test('E: camera switching uses the track API and is blocked during screen sharing', async () => {
  const h = createHarness();
  await h.controller.start({ callId: 'call-3', callType: 'video', direction: 'outgoing' }, { initiator: true });
  const facing = await h.controller.switchCamera();
  assert.equal(facing, 'environment');
  assert.equal(h.calls.switch, 1);
  await h.controller.startScreenShare();
  await assert.rejects(() => h.controller.switchCamera(), /STOP_SHARING_FIRST/);
  assert.equal(h.calls.switch, 1);
});

test('F/G/J: screen sharing sends a real track, then restores the camera or audio-only state', async () => {
  const withCamera = createHarness();
  await withCamera.controller.start({ callId: 'call-4', callType: 'video', direction: 'outgoing' }, { initiator: true });
  await withCamera.controller.startScreenShare();
  assert.equal(withCamera.calls.displayMedia, 1);
  assert.equal(withCamera.peer.transceivers[0].sender.track, withCamera.screenTrack);
  assert.equal(withCamera.controller.getState().screenSharing, true);
  await withCamera.controller.stopScreenShare();
  assert.equal(withCamera.peer.transceivers[0].sender.track, withCamera.cameraTrack);
  assert.equal(withCamera.controller.getState().screenSharing, false);
  assert.equal(withCamera.controller.getState().cameraEnabled, true);

  const audioOnly = createHarness();
  await audioOnly.controller.start({ callId: 'call-5', callType: 'audio', direction: 'outgoing' }, { initiator: true });
  await audioOnly.controller.startScreenShare();
  assert.equal(audioOnly.peer.transceivers[0].sender.track, audioOnly.screenTrack);
  await audioOnly.controller.stopScreenShare();
  assert.equal(audioOnly.peer.transceivers[0].sender.track, null);
  assert.equal(audioOnly.peer.transceivers[0].direction, 'inactive');
  assert.equal(audioOnly.controller.getState().videoEnabled, false);
});

test('H/I: denied screen capture and OS-ended capture clean up safely', async () => {
  const denied = createHarness({ denyScreen: true });
  await denied.controller.start({ callId: 'call-6', callType: 'video', direction: 'outgoing' }, { initiator: true });
  await assert.rejects(() => denied.controller.startScreenShare(), /NotAllowedError/);
  assert.equal(denied.controller.getState().screenSharing, false);
  assert.equal(denied.peer.transceivers[0].sender.track, denied.cameraTrack);

  const ended = createHarness();
  await ended.controller.start({ callId: 'call-7', callType: 'video', direction: 'outgoing' }, { initiator: true });
  await ended.controller.startScreenShare();
  ended.screenTrack.emit('ended');
  await settle();
  assert.equal(ended.controller.getState().screenSharing, false);
  assert.equal(ended.controller.getState().shareEndedBySystem, true);
  assert.equal(ended.peer.transceivers[0].sender.track, ended.cameraTrack);
});

test('K: audio constraints are platform-specific and passed to native getUserMedia', async () => {
  const android = createHarness();
  await android.controller.start({ callId: 'call-8', callType: 'audio', direction: 'outgoing' }, { initiator: true });
  assert.deepEqual(android.calls.userMedia[0].constraints.audio, {
    googEchoCancellation: true, googNoiseSuppression: true, googAutoGainControl: true,
  });
  const ios = createHarness();
  ios.controller = createNativeCallMediaController({
    mediaDevices: { getUserMedia: ios.calls.userMedia.push.bind([]), getDisplayMedia: async () => createStream([]) },
    RTCPeerConnection: function () { return ios.peer; },
    RTCSessionDescription: class {},
    RTCIceCandidate: class {},
    getAudioConstraints: () => true,
  });
  assert.equal(ios.controller.getState().status, 'idle');
});

test('L/M: route changes use the native module and hang-up restores the normal route', async () => {
  const h = createHarness();
  await h.controller.start({ callId: 'call-9', callType: 'audio', direction: 'outgoing' }, { initiator: true });
  const route = await h.controller.setAudioRoute('speaker');
  assert.equal(route.route, 'speaker');
  assert.equal(h.controller.getState().audioRoute, 'speaker');
  await h.controller.stop();
  assert.equal(h.calls.routeRestore, 1);
  assert.equal(h.peer.connectionState, 'closed');
  assert.equal(h.controller.getState().status, 'idle');
});

test('N: concurrent renegotiations are serialized and glare is handled by the polite side', async () => {
  const h = createHarness();
  await h.controller.start({ callId: 'call-10', callType: 'audio', direction: 'incoming' }, { initiator: false });
  const writes = [];
  const peer = h.peer;
  const originalSetLocal = peer.setLocalDescription.bind(peer);
  peer.setLocalDescription = async (desc) => { writes.push('local'); await originalSetLocal(desc); };
  await Promise.all([
    h.controller.setVideoEnabled(true),
    h.controller.setVideoEnabled(false),
  ]);
  assert.ok(writes.length >= 2);
  const collision = await h.controller.handleOffer({ callId: 'call-10', description: { type: 'offer', sdp: 'glare' } });
  assert.equal(collision, true);
  assert.equal(peer.remoteDescription.type, 'offer');
});

test('O: early ICE candidates are buffered until a remote description arrives', async () => {
  const h = createHarness();
  const applied = [];
  h.peer.addIceCandidate = async (candidate) => { applied.push(candidate.candidate); };
  await h.controller.start({ callId: 'call-11', callType: 'audio', direction: 'incoming' }, { initiator: false });
  h.controller.handleIce({ callId: 'call-11', candidate: { candidate: 'early' } });
  await settle();
  assert.deepEqual(applied, []);
  await h.controller.handleOffer({ callId: 'call-11', description: { type: 'offer', sdp: 'sdp' } });
  assert.deepEqual(applied, ['early']);
});

test('P/Q: late camera permission results and repeated room starts cannot revive or duplicate a call', async () => {
  const h = createHarness({ pendingCamera: true });
  await h.controller.start({ callId: 'call-12', callType: 'audio', direction: 'outgoing' }, { initiator: true });
  const pending = h.controller.setVideoEnabled(true);
  await settle();
  await h.controller.stop();
  h.resolveCamera();
  await pending;
  assert.equal(h.controller.getPeer(), null);
  assert.equal(h.cameraTrack.stopCount, 1);

  const room = createHarness();
  const call = { callId: 'call-13', callType: 'audio', direction: 'outgoing', participants: [{ id: 1 }, { id: 2 }] };
  const first = await room.controller.start(call, { initiator: true });
  const second = await room.controller.start({ ...call, participants: [{ id: 3 }] }, { initiator: false });
  assert.equal(first, second);
  assert.equal(room.emitted.filter((item) => item.event === 'call:signal:offer').length, 1);
  assert.deepEqual(INITIAL_STATE, { ...INITIAL_STATE });
});

test('an offer that arrives during microphone startup waits for the same capture', async () => {
  const h = createHarness({ pendingInitialMedia: true });
  const call = { callId: 'call-14', callType: 'audio', direction: 'outgoing' };
  const first = h.controller.start(call, { initiator: true });
  const second = h.controller.start(call, { initiator: false });
  assert.equal(first, second);
  await settle();
  assert.equal(h.calls.userMedia.length, 1);
  h.resolveInitial();
  await first;
  assert.equal(h.peer, await second);
  assert.equal(h.emitted.filter((item) => item.event === 'call:signal:offer').length, 1);
});

test('a pending iOS screen share can be cancelled before a frame track exists', async () => {
  const h = createHarness({ pendingDisplayMedia: true });
  await h.controller.start({ callId: 'call-15', callType: 'audio', direction: 'outgoing' }, { initiator: true });
  const pending = h.controller.startScreenShare();
  await settle();
  assert.equal(h.controller.getState().screenSharePending, true);
  await h.controller.cancelScreenShare();
  h.resolveDisplay();
  assert.equal(await pending, false);
  assert.equal(h.controller.getState().screenSharePending, false);
  assert.equal(h.peer.transceivers.length, 0);
});
