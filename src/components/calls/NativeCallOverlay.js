import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import {
  mediaDevices,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCView,
} from 'react-native-webrtc';
import { getWebRtcIceServers, isVideoEnabledCall } from '../../config/webrtcConfig';
import { useRealtime } from '../../context/RealtimeContext';
import { colors, radius, shadows, typography } from '../../theme';

const callTitle = (call = {}) => {
  if (call.callType === 'virtual_tour') return 'Virtual property tour';
  if (call.callType === 'video') return 'Video call';
  return 'Audio call';
};

const otherPartyName = (call = {}) =>
  call.direction === 'incoming'
    ? call.caller?.full_name || call.caller?.name || 'RentalHub user'
    : call.receiver?.full_name || call.receiver?.name || 'RentalHub user';

const getStreamUrl = (stream) => {
  if (!stream) return null;
  if (typeof stream.toURL === 'function') return stream.toURL();
  return stream._reactTag || null;
};

const NativeCallOverlay = () => {
  const {
    acceptCall,
    activeCall,
    clearCall,
    emitCallSignal,
    endCall,
    rejectCall,
    subscribe,
  } = useRealtime();
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const initializingRef = useRef(false);
  const activeCallRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [mediaStatus, setMediaStatus] = useState('idle');
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  const cleanupMedia = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.onicecandidate = null;
      peerRef.current.ontrack = null;
      peerRef.current.onconnectionstatechange = null;
      peerRef.current.close();
      peerRef.current = null;
    }

    localStreamRef.current?.getTracks?.().forEach((track) => track.stop());
    remoteStreamRef.current?.getTracks?.().forEach((track) => track.stop?.());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    initializingRef.current = false;
    setLocalStream(null);
    setRemoteStream(null);
    setMediaStatus('idle');
    setMicrophoneEnabled(true);
    setCameraEnabled(true);
  }, []);

  const createPeerConnection = useCallback((call) => {
    const peer = new RTCPeerConnection({ iceServers: getWebRtcIceServers() });

    peer.onicecandidate = (event) => {
      if (!event.candidate) return;
      emitCallSignal('call:signal:ice-candidate', {
        callId: call.callId,
        candidate: event.candidate,
      }).catch(() => {});
    };

    peer.ontrack = (event) => {
      const [stream] = event.streams || [];
      if (stream) {
        remoteStreamRef.current = stream;
        setRemoteStream(stream);
      }
    };

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'connected') {
        setMediaStatus('connected');
      } else if (['checking', 'disconnected'].includes(peer.connectionState)) {
        setMediaStatus('connecting');
      } else if (peer.connectionState === 'failed') {
        setMediaStatus('failed');
      }
    };

    return peer;
  }, [emitCallSignal]);

  const beginMediaCall = useCallback(async (call, { initiator = false } = {}) => {
    if (!call?.callId || initializingRef.current || peerRef.current) return;

    initializingRef.current = true;
    const videoCall = isVideoEnabledCall(call.callType);
    setMediaStatus(videoCall ? 'requesting_camera' : 'requesting_microphone');

    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: videoCall
          ? {
              facingMode: 'user',
              width: 640,
              height: 480,
              frameRate: 24,
            }
          : false,
      });

      localStreamRef.current = stream;
      setLocalStream(stream);
      setMicrophoneEnabled(stream.getAudioTracks().some((track) => track.enabled));
      setCameraEnabled(videoCall && stream.getVideoTracks().some((track) => track.enabled));

      const peer = createPeerConnection(call);
      peerRef.current = peer;
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      setMediaStatus('connecting');

      if (initiator) {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        await emitCallSignal('call:signal:offer', {
          callId: call.callId,
          description: peer.localDescription,
        });
      }
    } catch (error) {
      cleanupMedia();
      Toast.show({
        type: 'error',
        text1: 'Could not start media',
        text2: error.message || 'Camera or microphone permission failed.',
      });
      if (call?.callId) {
        endCall(call.callId).catch(() => {});
      }
    } finally {
      initializingRef.current = false;
    }
  }, [cleanupMedia, createPeerConnection, emitCallSignal, endCall]);

  useEffect(() => {
    if (activeCall?.status === 'accepted') {
      beginMediaCall(activeCall, { initiator: activeCall.direction === 'outgoing' });
    }
  }, [activeCall, beginMediaCall]);

  useEffect(() => {
    const unsubscribeOffer = subscribe('call:signal:offer', async ({ callId, description } = {}) => {
      const call = activeCallRef.current;
      if (!call || String(call.callId) !== String(callId)) return;
      try {
        if (!peerRef.current) {
          await beginMediaCall(call, { initiator: false });
        }
        const peer = peerRef.current;
        if (!peer) return;
        await peer.setRemoteDescription(new RTCSessionDescription(description));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        await emitCallSignal('call:signal:answer', {
          callId,
          description: peer.localDescription,
        });
      } catch (error) {
        Toast.show({ type: 'error', text1: 'Call offer failed', text2: error.message });
      }
    });

    const unsubscribeAnswer = subscribe('call:signal:answer', async ({ callId, description } = {}) => {
      const call = activeCallRef.current;
      if (!call || String(call.callId) !== String(callId) || !peerRef.current) return;
      try {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(description));
      } catch (error) {
        Toast.show({ type: 'error', text1: 'Call answer failed', text2: error.message });
      }
    });

    const unsubscribeIce = subscribe('call:signal:ice-candidate', async ({ callId, candidate } = {}) => {
      const call = activeCallRef.current;
      if (!call || String(call.callId) !== String(callId) || !peerRef.current || !candidate) return;
      try {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (_error) {
        // Late ICE candidates can arrive after a call ends; ignore safely.
      }
    });

    return () => {
      unsubscribeOffer();
      unsubscribeAnswer();
      unsubscribeIce();
    };
  }, [beginMediaCall, emitCallSignal, subscribe]);

  useEffect(() => {
    if (!activeCall) cleanupMedia();
    if (activeCall && ['rejected', 'missed', 'ended'].includes(activeCall.status)) cleanupMedia();
  }, [activeCall, cleanupMedia]);

  useEffect(() => cleanupMedia, [cleanupMedia]);

  if (!activeCall) return null;

  const isIncoming = activeCall.direction === 'incoming' && activeCall.status === 'ringing';
  const isAccepted = activeCall.status === 'accepted';
  const isClosing = ['rejected', 'missed', 'ended'].includes(activeCall.status);
  const videoCall = isVideoEnabledCall(activeCall.callType);
  const localUrl = getStreamUrl(localStream);
  const remoteUrl = getStreamUrl(remoteStream);

  const safeAction = async (action, fallback) => {
    try {
      await action();
    } catch (error) {
      Toast.show({ type: 'error', text1: fallback, text2: error.message });
    }
  };

  const toggleMicrophone = () => {
    const nextEnabled = !microphoneEnabled;
    localStreamRef.current?.getAudioTracks?.().forEach((track) => {
      track.enabled = nextEnabled;
    });
    setMicrophoneEnabled(nextEnabled);
  };

  const toggleCamera = () => {
    const nextEnabled = !cameraEnabled;
    localStreamRef.current?.getVideoTracks?.().forEach((track) => {
      track.enabled = nextEnabled;
    });
    setCameraEnabled(nextEnabled);
  };

  const hangUp = () => {
    cleanupMedia();
    return endCall(activeCall.callId);
  };

  return (
    <Modal transparent animationType="fade" visible>
      <View style={[styles.backdrop, isAccepted && styles.liveBackdrop]}>
        <View style={[styles.card, isAccepted && styles.liveCard]}>
          {isAccepted ? (
            <View style={styles.videoStage}>
              {remoteUrl && videoCall ? (
                <RTCView
                  mirror={false}
                  objectFit="cover"
                  streamURL={remoteUrl}
                  style={styles.remoteVideo}
                />
              ) : (
                <View style={styles.remotePlaceholder}>
                  {mediaStatus === 'requesting_camera' || mediaStatus === 'requesting_microphone' ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Icon name={videoCall ? 'videocam-outline' : 'call-outline'} size={42} color={colors.white} />
                  )}
                  <Text style={styles.remotePlaceholderText}>
                    {mediaStatus === 'connected'
                      ? videoCall ? 'Waiting for remote video…' : 'Audio session connected'
                      : 'Connecting media…'}
                  </Text>
                </View>
              )}
              {localUrl && videoCall ? (
                <RTCView
                  mirror
                  objectFit="cover"
                  streamURL={localUrl}
                  style={styles.localVideo}
                />
              ) : null}
            </View>
          ) : (
            <View style={[styles.iconWrap, isAccepted && styles.iconWrapLive]}>
              <Icon
                name={videoCall ? 'videocam-outline' : 'call-outline'}
                size={32}
                color={isAccepted ? colors.success : colors.blue}
              />
            </View>
          )}

          <Text style={[styles.eyebrow, isAccepted && styles.liveEyebrow]}>
            {isAccepted ? String(mediaStatus).replace(/_/g, ' ') : activeCall.status || 'RINGING'}
          </Text>
          <Text style={[styles.title, isAccepted && styles.liveTitle]}>{callTitle(activeCall)}</Text>
          <Text style={[styles.subtitle, isAccepted && styles.liveSubtitle]}>
            {isIncoming
              ? `${otherPartyName(activeCall)} is requesting this session.`
              : `With ${otherPartyName(activeCall)}`}
          </Text>
          {activeCall.propertyTitle ? (
            <Text style={[styles.propertyText, isAccepted && styles.livePropertyText]}>
              {activeCall.propertyTitle}
            </Text>
          ) : null}

          <View style={styles.actions}>
            {isIncoming ? (
              <>
                <TouchableOpacity
                  accessibilityLabel="Reject call"
                  accessibilityRole="button"
                  style={[styles.roundButton, styles.rejectButton]}
                  onPress={() => safeAction(() => rejectCall(activeCall.callId), 'Could not reject call')}
                >
                  <Icon name="close" size={24} color={colors.white} />
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityLabel="Accept call"
                  accessibilityRole="button"
                  style={[styles.roundButton, styles.acceptButton]}
                  onPress={() => safeAction(() => acceptCall(activeCall.callId), 'Could not accept call')}
                >
                  <Icon name="call" size={24} color={colors.white} />
                </TouchableOpacity>
              </>
            ) : isAccepted ? (
              <>
                <TouchableOpacity
                  accessibilityLabel={microphoneEnabled ? 'Mute microphone' : 'Unmute microphone'}
                  accessibilityRole="button"
                  style={[styles.roundButton, styles.controlButton, !microphoneEnabled && styles.controlButtonMuted]}
                  onPress={toggleMicrophone}
                >
                  <Icon name={microphoneEnabled ? 'mic-outline' : 'mic-off-outline'} size={22} color={colors.white} />
                </TouchableOpacity>
                {videoCall ? (
                  <TouchableOpacity
                    accessibilityLabel={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
                    accessibilityRole="button"
                    style={[styles.roundButton, styles.controlButton, !cameraEnabled && styles.controlButtonMuted]}
                    onPress={toggleCamera}
                  >
                    <Icon name={cameraEnabled ? 'videocam-outline' : 'videocam-off-outline'} size={22} color={colors.white} />
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  accessibilityLabel="End call"
                  accessibilityRole="button"
                  style={[styles.roundButton, styles.rejectButton]}
                  onPress={() => safeAction(hangUp, 'Could not end call')}
                >
                  <Icon name="call" size={22} color={colors.white} />
                </TouchableOpacity>
              </>
            ) : isClosing ? (
              <TouchableOpacity accessibilityRole="button" style={styles.closeButton} onPress={clearCall}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                accessibilityRole="button"
                style={[styles.endButton, styles.rejectWideButton]}
                onPress={() => safeAction(hangUp, 'Could not cancel call')}
              >
                <Icon name="close" size={18} color={colors.white} />
                <Text style={styles.endButtonText}>Cancel request</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(7, 26, 61, 0.72)',
    flex: 1,
    justifyContent: 'center',
    padding: 22,
  },
  liveBackdrop: {
    backgroundColor: '#020817',
    padding: 0,
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    maxWidth: 430,
    padding: 24,
    width: '100%',
    ...shadows.soft,
  },
  liveCard: {
    backgroundColor: '#020817',
    borderRadius: 0,
    flex: 1,
    justifyContent: 'flex-end',
    maxWidth: undefined,
    padding: 18,
  },
  videoStage: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#020817',
  },
  remoteVideo: {
    ...StyleSheet.absoluteFillObject,
  },
  remotePlaceholder: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  remotePlaceholderText: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  localVideo: {
    backgroundColor: '#111827',
    borderColor: colors.white,
    borderRadius: 18,
    borderWidth: 2,
    height: 150,
    position: 'absolute',
    right: 18,
    top: 54,
    width: 112,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 36,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  iconWrapLive: {
    backgroundColor: '#ECFDF3',
  },
  eyebrow: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 10,
    letterSpacing: 1.2,
    marginTop: 18,
    textTransform: 'uppercase',
  },
  liveEyebrow: {
    color: colors.gold,
    marginTop: 'auto',
  },
  title: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 24,
    marginTop: 6,
    textAlign: 'center',
  },
  liveTitle: {
    color: colors.white,
  },
  subtitle: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    textAlign: 'center',
  },
  liveSubtitle: {
    color: '#CBD5E1',
  },
  propertyText: {
    color: colors.muted,
    fontFamily: typography.semibold,
    fontSize: 12,
    marginTop: 7,
    textAlign: 'center',
  },
  livePropertyText: {
    color: '#94A3B8',
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 18,
    justifyContent: 'center',
    marginTop: 22,
  },
  roundButton: {
    alignItems: 'center',
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  rejectButton: {
    backgroundColor: colors.danger,
  },
  acceptButton: {
    backgroundColor: colors.success,
  },
  controlButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  controlButtonMuted: {
    backgroundColor: colors.danger,
  },
  endButton: {
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minWidth: 170,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  rejectWideButton: {
    backgroundColor: colors.navy,
  },
  endButtonText: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 14,
  },
  closeButton: {
    backgroundColor: colors.surfaceBlue,
    borderRadius: radius.pill,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  closeButtonText: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 14,
  },
});

export default NativeCallOverlay;
