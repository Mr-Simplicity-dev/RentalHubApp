const { createCallSignalBuffer } = require('./callSignalBuffer.cjs');

const INITIAL_STATE = {
  status: 'idle',
  microphoneEnabled: true,
  cameraEnabled: false,
  videoEnabled: false,
  screenSharing: false,
  screenSharePending: false,
  facingMode: 'user',
  audioRoute: 'unknown',
  audioRouteAvailable: [],
  audioRouteSupported: false,
  localVideoStream: null,
  remoteStream: null,
};

const createNativeCallMediaController = (deps = {}) => {
  const {
    mediaDevices = null,
    RTCPeerConnection = null,
    RTCSessionDescription = null,
    RTCIceCandidate = null,
    loadIceServers = async () => [],
    emitSignal = async () => {},
    presentScreenPicker = async () => {},
    createSignalBuffer = createCallSignalBuffer,
    getAudioConstraints = () => true,
    getVideoConstraints = () => ({ facingMode: 'user' }),
    audioRoute = null,
    onState = () => {},
    isVideoCall = (callType) => ['video', 'virtual_tour'].includes(callType),
  } = deps;

  let call = null;
  let generation = 0;
  let closed = true;
  let peer = null;
  let remoteStream = null;
  let localStream = null;
  let cameraStream = null;
  let screenStream = null;
  let audioTrack = null;
  let cameraTrack = null;
  let screenTrack = null;
  let videoTransceiver = null;
  let signalBuffer = createSignalBuffer();
  let startPromise = null;
  let chain = Promise.resolve();
  let makingOffer = false;
  let settingRemoteAnswer = false;
  let ignoreOffer = false;
  let polite = true;
  let screenRequestId = 0;
  let state = { ...INITIAL_STATE };
  let screenEndedHandler = null;

  const publish = (patch = {}) => {
    state = { ...state, ...patch };
    onState({ ...state });
  };

  const current = (candidate) => !closed && candidate === generation;
  const enqueue = (task) => {
    const next = chain.then(task, task);
    chain = next.catch(() => {});
    return next;
  };

  const stopTracks = (stream) => {
    if (!stream?.getTracks) return;
    stream.getTracks().forEach((track) => {
      try { track.stop?.(); } catch (_error) {}
    });
  };

  const stopTrack = (track) => {
    try { track?.stop?.(); } catch (_error) {}
  };

  const mediaStreamFromTrack = (track, kind) => {
    if (!track || !mediaDevices || !mediaDevices.getDisplayMedia) {
      return track ? { getTracks: () => [track], getVideoTracks: () => (kind === 'video' ? [track] : []) } : null;
    }
    return { getTracks: () => [track], getVideoTracks: () => (kind === 'video' ? [track] : []) };
  };

  const ensureVideoTransceiver = (candidate) => {
    if (!current(candidate) || !peer) return null;
    if (!videoTransceiver) {
      videoTransceiver = peer.addTransceiver('video', { direction: 'inactive' });
    }
    return videoTransceiver;
  };

  const negotiate = (candidate) => enqueue(async () => {
    if (!current(candidate) || !peer || peer.signalingState === 'closed' || makingOffer) return;
    makingOffer = true;
    try {
      const offer = await peer.createOffer();
      if (!current(candidate)) return;
      await peer.setLocalDescription(offer);
      await emitSignal('call:signal:offer', {
        callId: call.callId,
        description: peer.localDescription || offer,
      });
    } finally {
      makingOffer = false;
    }
  });

  const drainIce = (candidate) => enqueue(async () => {
    if (!current(candidate) || !peer) return;
    await signalBuffer.drain(call.callId, peer, RTCIceCandidate);
  });

  const handleOffer = ({ callId, description } = {}) => {
    const candidate = generation;
    if (!call || String(call.callId) !== String(callId) || !description) return Promise.resolve(false);
    return enqueue(async () => {
      if (!current(candidate) || !peer) return false;
      const stable = peer.signalingState === 'stable' || settingRemoteAnswer;
      const collision = description.type === 'offer' && (!stable || makingOffer);
      ignoreOffer = !polite && collision;
      if (ignoreOffer) return false;
      try {
        if (collision) await peer.setRemoteDescription({ type: 'rollback', sdp: '' });
        settingRemoteAnswer = description.type === 'answer';
        await peer.setRemoteDescription(new RTCSessionDescription(description));
        settingRemoteAnswer = false;
        await signalBuffer.drain(call.callId, peer, RTCIceCandidate);
        if (description.type === 'offer') {
          const answer = await peer.createAnswer();
          if (!current(candidate)) return true;
          await peer.setLocalDescription(answer);
          await emitSignal('call:signal:answer', {
            callId: call.callId,
            description: peer.localDescription || answer,
          });
        }
        return true;
      } finally {
        settingRemoteAnswer = false;
        ignoreOffer = false;
      }
    });
  };

  const handleAnswer = ({ callId, description } = {}) => {
    const candidate = generation;
    if (!call || String(call.callId) !== String(callId) || !description) return Promise.resolve(false);
    return enqueue(async () => {
      if (!current(candidate) || !peer) return false;
      settingRemoteAnswer = true;
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(description));
        await signalBuffer.drain(call.callId, peer, RTCIceCandidate);
        return true;
      } finally {
        settingRemoteAnswer = false;
      }
    });
  };

  const handleIce = ({ callId, candidate: iceCandidate } = {}) => {
    if (!call || String(call.callId) !== String(callId) || !iceCandidate) return;
    signalBuffer.add(call.callId, iceCandidate);
    void drainIce(generation);
  };

  const attachPeerHandlers = (candidate, targetCall) => {
    peer.onicecandidate = (event) => {
      if (!event?.candidate || !current(candidate)) return;
      void emitSignal('call:signal:ice-candidate', {
        callId: targetCall.callId,
        candidate: event.candidate,
      }).catch(() => {});
    };
    peer.ontrack = (event) => {
      if (!current(candidate)) return;
      const [stream] = event.streams || [];
      if (stream) {
        remoteStream = stream;
        publish({ remoteStream });
      }
    };
    peer.onconnectionstatechange = () => {
      if (!current(candidate) || !peer) return;
      const connection = peer.connectionState;
      if (connection === 'connected') publish({ status: 'connected' });
      else if (['checking', 'disconnected'].includes(connection)) publish({ status: 'connecting' });
      else if (connection === 'failed') publish({ status: 'failed' });
      else if (connection === 'closed') publish({ status: 'idle' });
    };
  };

  const start = (targetCall, { initiator = false } = {}) => {
    if (!targetCall?.callId) return Promise.resolve(null);
    if (peer && call?.callId === targetCall.callId) return Promise.resolve(peer);
    if (startPromise && call?.callId === targetCall.callId) return startPromise;

    generation += 1;
    const candidate = generation;
    closed = false;
    call = targetCall;
    polite = targetCall.direction === 'incoming';
    signalBuffer = createSignalBuffer();
    screenRequestId = 0;
    makingOffer = false;
    settingRemoteAnswer = false;
    ignoreOffer = false;
    chain = Promise.resolve();
    audioTrack = null;
    cameraTrack = null;
    screenTrack = null;
    cameraStream = null;
    screenStream = null;
    localStream = null;
    remoteStream = null;
    videoTransceiver = null;
    state = { ...INITIAL_STATE, audioRouteSupported: Boolean(audioRoute) };
    publish({ status: isVideoCall(targetCall.callType) ? 'requesting_camera' : 'requesting_microphone' });

    const initialization = (async () => {
      try {
        if (!mediaDevices || !RTCPeerConnection) throw new Error('Calling is unavailable in this app version.');
        const iceServers = await loadIceServers();
        if (!current(candidate)) return null;

        const videoCall = isVideoCall(targetCall.callType);
        const constraints = {
          audio: getAudioConstraints(),
          video: videoCall ? getVideoConstraints(state.facingMode, true) : false,
        };
        let stream;
        try {
          stream = await mediaDevices.getUserMedia(constraints);
        } catch (highQualityError) {
          if (!videoCall || !current(candidate)) throw highQualityError;
          stream = await mediaDevices.getUserMedia({
            audio: getAudioConstraints(),
            video: getVideoConstraints(state.facingMode, false),
          });
        }
        if (!current(candidate)) {
          stopTracks(stream);
          return null;
        }

        localStream = stream;
        audioTrack = stream.getAudioTracks?.()[0] || null;
        cameraTrack = stream.getVideoTracks?.()[0] || null;
        cameraStream = cameraTrack ? mediaStreamFromTrack(cameraTrack, 'video') : null;

        peer = new RTCPeerConnection({ iceServers });
        attachPeerHandlers(candidate, targetCall);
        if (audioTrack) peer.addTrack(audioTrack, stream);
        if (cameraTrack) {
          videoTransceiver = peer.addTransceiver('video', { direction: 'sendrecv', streams: [stream] });
          if (videoTransceiver.sender?.replaceTrack) {
            await videoTransceiver.sender.replaceTrack(cameraTrack);
          }
        }
        if (!current(candidate)) return null;

        publish({
          status: 'connecting',
          microphoneEnabled: Boolean(audioTrack?.enabled),
          cameraEnabled: Boolean(cameraTrack?.enabled),
          videoEnabled: Boolean(cameraTrack),
          localVideoStream: cameraStream,
          audioRouteSupported: Boolean(audioRoute),
        });
        if (audioRoute?.getState) void refreshRoute();
        if (initiator) await negotiate(candidate);
        return peer;
      } catch (error) {
        if (current(candidate)) {
          await stop();
        }
        throw error;
      }
    })();
    const pending = initialization.finally(() => {
      if (startPromise === pending) startPromise = null;
    });
    startPromise = pending;
    return pending;
  };

  const setMicrophoneEnabled = (nextEnabled) => {
    const enabled = Boolean(nextEnabled);
    audioTrack?.enabled !== undefined && (audioTrack.enabled = enabled);
    publish({ microphoneEnabled: enabled });
    return enabled;
  };

  const setVideoEnabled = async (nextEnabled) => {
    const candidate = generation;
    const enabled = Boolean(nextEnabled);
    if (!current(candidate) || state.screenSharing) return state.videoEnabled;
    if (!enabled) {
      if (!videoTransceiver) return false;
      stopTrack(cameraTrack);
      cameraTrack = null;
      cameraStream = null;
      await videoTransceiver.sender?.replaceTrack?.(null);
      if (videoTransceiver.direction !== 'inactive') videoTransceiver.direction = 'inactive';
      publish({ videoEnabled: false, cameraEnabled: false, localVideoStream: null, status: state.status === 'connected' ? 'connected' : state.status });
      await negotiate(candidate);
      return false;
    }

    const transceiver = ensureVideoTransceiver(candidate);
    if (!transceiver) return false;
    const stream = await mediaDevices.getUserMedia({ audio: false, video: getVideoConstraints(state.facingMode, true) });
    if (!current(candidate)) {
      stopTracks(stream);
      return false;
    }
    const track = stream.getVideoTracks?.()[0] || null;
    if (!track) {
      stopTracks(stream);
      throw new Error('Camera capture was not started.');
    }
    cameraTrack = track;
    cameraStream = mediaStreamFromTrack(track, 'video');
    await transceiver.sender?.replaceTrack?.(track);
    if (transceiver.direction !== 'sendrecv') transceiver.direction = 'sendrecv';
    publish({ videoEnabled: true, cameraEnabled: true, localVideoStream: cameraStream });
    await negotiate(candidate);
    return true;
  };

  const switchCamera = async () => {
    const candidate = generation;
    if (!current(candidate)) return;
    if (state.screenSharing) throw new Error('STOP_SHARING_FIRST');
    if (!cameraTrack) throw new Error('CAMERA_OFF');
    const nextFacing = state.facingMode === 'user' ? 'environment' : 'user';
    if (typeof cameraTrack._switchCamera === 'function') {
      cameraTrack._switchCamera();
    } else if (typeof cameraTrack.applyConstraints === 'function') {
      await cameraTrack.applyConstraints({ facingMode: nextFacing });
    } else {
      throw new Error('CAMERA_SWITCH_UNSUPPORTED');
    }
    publish({ facingMode: nextFacing });
    return nextFacing;
  };

  const clearScreenEndedHandler = () => {
    if (!screenTrack || !screenEndedHandler) return;
    try { screenTrack.removeEventListener?.('ended', screenEndedHandler); } catch (_error) {}
    screenEndedHandler = null;
  };

  const stopScreenShare = async ({ fromSystem = false } = {}) => {
    const candidate = generation;
    if (!screenTrack) return state;
    screenRequestId += 1;
    clearScreenEndedHandler();
    stopTracks(screenStream);
    screenTrack = null;
    screenStream = null;
    const restoreCamera = Boolean(cameraTrack && state.cameraEnabled);
    const transceiver = videoTransceiver;
    if (transceiver) {
      await transceiver.sender?.replaceTrack?.(restoreCamera ? cameraTrack : null);
      const direction = restoreCamera ? 'sendrecv' : 'inactive';
      if (transceiver.direction !== direction) transceiver.direction = direction;
    }
    if (!restoreCamera) {
      stopTrack(cameraTrack);
      cameraTrack = null;
      cameraStream = null;
    }
    publish({
      screenSharing: false,
      screenSharePending: false,
      videoEnabled: restoreCamera,
      cameraEnabled: restoreCamera,
      localVideoStream: restoreCamera ? cameraStream : null,
      shareEndedBySystem: fromSystem,
    });
    if (transceiver && !restoreCamera) await negotiate(candidate);
    return { restoredCamera: restoreCamera, fromSystem };
  };

  const startScreenShare = async () => {
    const candidate = generation;
    if (!current(candidate) || state.screenSharing) return state.screenSharing;
    const requestId = ++screenRequestId;
    publish({ screenSharePending: true });
    try {
      await presentScreenPicker();
      if (!current(candidate) || requestId !== screenRequestId) {
        publish({ screenSharePending: false });
        return false;
      }
      const stream = await mediaDevices.getDisplayMedia();
      if (!current(candidate) || requestId !== screenRequestId) {
        stopTracks(stream);
        publish({ screenSharePending: false });
        return false;
      }
      const track = stream.getVideoTracks?.()[0] || null;
      if (!track) {
        stopTracks(stream);
        throw new Error('SCREEN_TRACK_MISSING');
      }
      screenStream = stream;
      screenTrack = track;
      const transceiver = ensureVideoTransceiver(candidate);
      if (!transceiver) {
        stopTracks(stream);
        screenStream = null;
        screenTrack = null;
        publish({ screenSharePending: false });
        return false;
      }
      const needsRenegotiation = !transceiver.sender?.track || transceiver.direction !== 'sendrecv' || !peer?.remoteDescription;
      await transceiver.sender?.replaceTrack?.(track);
      if (transceiver.direction !== 'sendrecv') transceiver.direction = 'sendrecv';
      publish({
        screenSharing: true,
        screenSharePending: false,
        videoEnabled: true,
        cameraEnabled: Boolean(cameraTrack && state.cameraEnabled),
        localVideoStream: null,
        shareEndedBySystem: false,
      });
      screenEndedHandler = () => {
        if (screenTrack !== track) return;
        void stopScreenShare({ fromSystem: true });
      };
      track.addEventListener?.('ended', screenEndedHandler);
      if (needsRenegotiation) await negotiate(candidate);
      return true;
    } catch (error) {
      if (current(candidate) && requestId === screenRequestId) {
        stopTracks(screenStream);
        screenStream = null;
        screenTrack = null;
        clearScreenEndedHandler();
        publish({ screenSharing: false, screenSharePending: false });
      }
      throw error;
    }
  };

  const cancelScreenShare = async () => {
    const candidate = generation;
    if (screenTrack) return stopScreenShare({ fromSystem: false });
    if (!state.screenSharing && !state.screenSharePending) return false;
    screenRequestId += 1;
    stopTracks(screenStream);
    screenStream = null;
    screenTrack = null;
    clearScreenEndedHandler();
    if (current(candidate)) publish({ screenSharePending: false, screenSharing: false });
    return true;
  };

  const refreshRoute = async () => {
    if (!audioRoute?.getState) return null;
    try {
      const next = await audioRoute.getState();
      if (!current(generation)) return null;
      const normalized = next || {};
      publish({
        audioRoute: normalized.route || 'unknown',
        audioRouteAvailable: Array.isArray(normalized.available) ? normalized.available : [],
        audioRouteSupported: normalized.supported !== false,
      });
      return normalized;
    } catch (_error) {
      return null;
    }
  };

  const setAudioRoute = async (route) => {
    if (!audioRoute?.setRoute) throw new Error('AUDIO_ROUTE_UNSUPPORTED');
    const next = await audioRoute.setRoute(route);
    if (!current(generation)) return null;
    const normalized = next || {};
    publish({
      audioRoute: normalized.route || route,
      audioRouteAvailable: Array.isArray(normalized.available) ? normalized.available : state.audioRouteAvailable,
      audioRouteSupported: normalized.supported !== false,
    });
    return normalized;
  };

  const stop = async () => {
    generation += 1;
    closed = true;
    screenRequestId += 1;
    clearScreenEndedHandler();
    if (peer) {
      peer.onicecandidate = null;
      peer.ontrack = null;
      peer.onconnectionstatechange = null;
      try { peer.close?.(); } catch (_error) {}
    }
    peer = null;
    startPromise = null;
    stopTracks(localStream);
    stopTracks(cameraStream);
    stopTracks(screenStream);
    if (remoteStream?.getTracks) remoteStream.getTracks().forEach((track) => {
      try { track.stop?.(); } catch (_error) {}
    });
    localStream = null;
    cameraStream = null;
    screenStream = null;
    audioTrack = null;
    cameraTrack = null;
    screenTrack = null;
    videoTransceiver = null;
    remoteStream = null;
    signalBuffer.clear();
    chain = Promise.resolve();
    makingOffer = false;
    settingRemoteAnswer = false;
    call = null;
    state = { ...INITIAL_STATE, audioRouteSupported: Boolean(audioRoute) };
    onState({ ...state });
    if (audioRoute?.restore) {
      try { await audioRoute.restore(); } catch (_error) {}
    }
  };

  return {
    start,
    handleOffer,
    handleAnswer,
    handleIce,
    setMicrophoneEnabled,
    setVideoEnabled,
    switchCamera,
    startScreenShare,
    stopScreenShare,
    cancelScreenShare,
    setAudioRoute,
    refreshRoute,
    stop,
    getState: () => ({ ...state }),
    getPeer: () => peer,
  };
};

module.exports = { createNativeCallMediaController, INITIAL_STATE };
