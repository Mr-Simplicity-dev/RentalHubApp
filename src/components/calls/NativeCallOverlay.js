import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import TextInput from '../common/AppTextInput';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { getWebRtcIceServers, isVideoEnabledCall } from '../../config/webrtcConfig';
import { useRealtime } from '../../context/RealtimeContext';
import { AuthContext } from '../../context/AuthContext';
import { voiceMonitorService } from '../../services/voiceMonitorService';
import { colors, radius, shadows, typography, typeScale } from '../../theme';

import AppText from '../../components/common/AppText';
let mediaDevices, RTCIceCandidate, RTCPeerConnection, RTCSessionDescription, RTCView;
try {
  const WebRTC = require('react-native-webrtc');
  mediaDevices = WebRTC.mediaDevices;
  RTCIceCandidate = WebRTC.RTCIceCandidate;
  RTCPeerConnection = WebRTC.RTCPeerConnection;
  RTCSessionDescription = WebRTC.RTCSessionDescription;
  RTCView = WebRTC.RTCView;
} catch (e) {
  // WebRTC native module not available — calls will gracefully fail
}

const callTitle = (call = {}) => {
  if (call.isSupport) return 'Support call';
  if (call.callType === 'virtual_tour') return 'Virtual property tour';
  if (call.callType === 'video') return 'Video call';
  return 'Audio call';
};

const otherPartyName = (call = {}) => {
  if (!call) return 'RentalHub user';
  return call.direction === 'incoming'
    ? call.caller?.full_name || call.caller?.name || 'RentalHub user'
    : call.receiver?.full_name || call.receiver?.name || 'RentalHub user';
};

const normalizeParticipants = (call = {}) => {
  if (!call) return [];

  const rawParticipants = Array.isArray(call?.participants)
    ? call.participants
    : Array.isArray(call?.supportParticipants)
      ? call.supportParticipants
      : [];

  if (rawParticipants.length) {
    return rawParticipants.slice(0, 5).map((participant, index) => ({
      id: participant?.id || participant?.userId || participant?.callId || `${participant?.name || 'participant'}-${index}`,
      name: participant?.name || participant?.full_name || participant?.displayName || participant?.role || `Agent ${index + 1}`,
      role: participant?.role || participant?.status || (index === 0 ? 'Speaker' : 'Listener'),
      status: participant?.status || (index === 0 ? 'Connected' : 'Listening'),
    }));
  }

  const primaryName = otherPartyName(call);
  return [{
    id: call?.callId || 'primary-call',
    name: primaryName,
    role: call?.direction === 'incoming' ? 'Caller' : 'Guest',
    status: 'Connected',
  }];
};

const getParticipantInitials = (participant = {}) => {
  const label = String(participant.name || 'A').trim();
  if (!label) return 'A';
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'A';
};

const getStreamUrl = (stream) => {
  if (!stream) return null;
  if (typeof stream.toURL === 'function') return stream.toURL();
  return stream._reactTag || null;
};

const NativeCallOverlay = () => {
  const interfaceLanguage = useInterfaceLanguage();
  const {
    acceptCall,
    activeCall,
    addCallParticipant,
    clearCall,
    emitCallSignal,
    endCall,
    rejectCall,
    removeCallParticipant,
    subscribe,
    transferCallHost,
  } = useRealtime();
  const { user } = React.useContext(AuthContext);
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
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [participantUserId, setParticipantUserId] = useState('');
  const [recentRoomHistory, setRecentRoomHistory] = useState([]);
  const displayParticipants = useMemo(() => normalizeParticipants(activeCall), [activeCall, interfaceLanguage]);

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
      const videoConstraints = videoCall
        ? {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30, max: 30 },
          }
        : false;

      let stream;
      try {
        stream = await mediaDevices.getUserMedia({ audio: true, video: videoConstraints });
      } catch (highQualityError) {
        // A slow phone or a weak camera may refuse 720p. Falling back to a
        // lower resolution keeps the call alive instead of failing it.
        if (!videoCall) throw highQualityError;

        stream = await mediaDevices.getUserMedia({
          audio: true,
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } },
        });
      }

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
        text1: ui("Could not start media"),
        text2: error.message || ui("Camera or microphone permission failed."),
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
    let isMounted = true;
    const loadRecentHistory = async () => {
      if (!user?.id) return;
      try {
        const response = await voiceMonitorService.myCallRoomHistory();
        if (!isMounted) return;
        setRecentRoomHistory(Array.isArray(response?.data) ? response.data : []);
      } catch {
        if (isMounted) setRecentRoomHistory([]);
      }
    };

    void loadRecentHistory();
    return () => { isMounted = false; };
  }, [user?.id]);

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
        Toast.show({ type: 'error', text1: ui("Call offer failed"), text2: error.message });
      }
    });

    const unsubscribeAnswer = subscribe('call:signal:answer', async ({ callId, description } = {}) => {
      const call = activeCallRef.current;
      if (!call || String(call.callId) !== String(callId) || !peerRef.current) return;
      try {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(description));
      } catch (error) {
        Toast.show({ type: 'error', text1: ui("Call answer failed"), text2: error.message });
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
  const participantColors = ['#2563eb', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
  const participantSummary = displayParticipants.length > 1
    ? `${displayParticipants.length}-way support room`
    : callTitle(activeCall);

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

  const handleAddParticipant = async () => {
    const parsedId = Number(String(participantUserId).trim());
    if (!activeCall?.callId || !parsedId || !addCallParticipant) return;

    const response = await addCallParticipant({
      callId: activeCall.callId,
      userId: parsedId,
      role: 'participant',
    });

    if (response?.success) {
      setParticipantUserId('');
      setShowAddParticipant(false);
    } else {
      Toast.show({
        type: 'error',
        text1: ui("Could not add participant"),
        text2: response?.message || ui("Please try another user."),
      });
    }
  };

  const handleRemoveParticipant = async (targetUserId) => {
    if (!activeCall?.callId || !targetUserId || !removeCallParticipant) return;

    const response = await removeCallParticipant({
      callId: activeCall.callId,
      userId: Number(targetUserId),
    });

    if (!response?.success) {
      Toast.show({
        type: 'error',
        text1: ui("Could not remove participant"),
        text2: response?.message || ui("Please try again."),
      });
    }
  };

  const handleTransferHost = async (targetUserId) => {
    if (!activeCall?.callId || !targetUserId || !transferCallHost) return;

    const response = await transferCallHost({
      callId: activeCall.callId,
      userId: Number(targetUserId),
    });

    if (!response?.success) {
      Toast.show({
        type: 'error',
        text1: ui("Could not transfer host"),
        text2: response?.message || ui("Please try again."),
      });
    }
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
                  <AppText style={styles.remotePlaceholderText}>
                    {mediaStatus === "connected"
                      ? videoCall ? 'Waiting for remote video…' : 'Audio session connected'
                      : 'Connecting media…'}
                  </AppText>
                </View>
              )}
              {displayParticipants.length > 1 ? (
                <View style={styles.participantGrid}>
                  {displayParticipants.slice(0, 5).map((participant, index) => (
                    <View
                      key={participant.id || `${participant.name}-${index}`}
                      style={[
                        styles.participantTile,
                        index === 0 && styles.primaryParticipantTile,
                        { borderColor: participantColors[index % participantColors.length] },
                      ]}
                    >
                      {Number(activeCall?.hostUserId || activeCall?.caller?.id) === Number(user?.id) && Number(participant.id) !== Number(activeCall?.hostUserId || activeCall?.caller?.id) ? (
                        <TouchableOpacity
                          accessibilityRole="button"
                          onPress={() => handleTransferHost(participant.id)}
                          style={styles.transferHostButton}
                        >
                          <Icon name="arrow-redo-outline" size={14} color={colors.white} />
                        </TouchableOpacity>
                      ) : null}
                      {Number(participant.id) !== Number(activeCall?.caller?.id) && Number(participant.id) !== Number(activeCall?.receiver?.id) ? (
                        <TouchableOpacity
                          accessibilityRole="button"
                          onPress={() => handleRemoveParticipant(participant.id)}
                          style={styles.removeParticipantButton}
                        >
                          <Icon name="close-circle" size={16} color={colors.white} />
                        </TouchableOpacity>
                      ) : null}
                      <View
                        style={[
                          styles.participantAvatar,
                          { backgroundColor: participantColors[index % participantColors.length] },
                        ]}
                      >
                        <AppText style={styles.participantAvatarText}>{getParticipantInitials(participant)}</AppText>
                      </View>
                      <AppText style={styles.participantName} numberOfLines={1}>{participant.name}</AppText>
                      <AppText style={styles.participantRole}>{participant.role}</AppText>
                    </View>
                  ))}
                </View>
              ) : null}
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

          <AppText style={[styles.eyebrow, isAccepted && styles.liveEyebrow]}>
            {isAccepted ? String(mediaStatus).replace(/_/g, ' ') : activeCall.status || 'RINGING'}
          </AppText>
          <AppText style={[styles.title, isAccepted && styles.liveTitle]}>{participantSummary}</AppText>
          <AppText style={[styles.subtitle, isAccepted && styles.liveSubtitle]}>
            {isIncoming
              ? ui("{value0} is requesting this session.", {value0: (otherPartyName(activeCall))})
              : displayParticipants.length > 1
                ? ui("{value0} active participants in this call room.", {value0: (displayParticipants.length)})
                : ui("With {value0}", {value0: (otherPartyName(activeCall))})}
          </AppText>
          {activeCall.propertyTitle ? (
            <AppText style={[styles.propertyText, isAccepted && styles.livePropertyText]}>
              {activeCall.propertyTitle}
            </AppText>
          ) : null}

          {recentRoomHistory.length > 0 ? (
            <View style={styles.historyCard}>
              <AppText style={styles.historyTitle}>{ui("Recent room activity")}</AppText>
              {recentRoomHistory.slice(0, 3).map((event) => (
                <View key={event.id || `${event.callId}-${event.createdAt}`} style={styles.historyRow}>
                  <AppText style={styles.historyAction}>{String(event.action || '').replace(/_/g, ' ')}</AppText>
                  <AppText style={styles.historyMeta}>
                    {event.actorName || 'Someone'} → {event.targetName || ui("Room")}
                  </AppText>
                </View>
              ))}
            </View>
          ) : null}

          {isAccepted ? (
            <View style={styles.addParticipantBlock}>
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.addParticipantButton}
                onPress={() => setShowAddParticipant((current) => !current)}
              >
                <Icon name="person-add-outline" size={18} color={colors.white} />
                <AppText style={styles.addParticipantButtonText}>{ui("Add participant")}</AppText>
              </TouchableOpacity>
              {showAddParticipant ? (
                <View style={styles.addParticipantRow}>
                  <TextInput
                    value={participantUserId}
                    onChangeText={setParticipantUserId}
                    keyboardType="numeric"
                    placeholder={ui("User ID")}
                    style={styles.addParticipantInput}
                    placeholderTextColor="#94a3b8"
                  />
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={styles.addParticipantSubmit}
                    onPress={handleAddParticipant}
                  >
                    <AppText style={styles.addParticipantSubmitText}>{ui("Add")}</AppText>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.actions}>
            {isIncoming ? (
              <>
                <TouchableOpacity
                  accessibilityLabel={ui("Reject call")}
                  accessibilityRole="button"
                  style={[styles.roundButton, styles.rejectButton]}
                  onPress={() => safeAction(() => rejectCall(activeCall.callId), 'Could not reject call')}
                >
                  <Icon name="close" size={24} color={colors.white} />
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityLabel={ui("Accept call")}
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
                    accessibilityLabel={cameraEnabled ? ui("Turn camera off") : ui("Turn camera on")}
                    accessibilityRole="button"
                    style={[styles.roundButton, styles.controlButton, !cameraEnabled && styles.controlButtonMuted]}
                    onPress={toggleCamera}
                  >
                    <Icon name={cameraEnabled ? 'videocam-outline' : 'videocam-off-outline'} size={22} color={colors.white} />
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  accessibilityLabel={ui("End call")}
                  accessibilityRole="button"
                  style={[styles.roundButton, styles.rejectButton]}
                  onPress={() => safeAction(hangUp, 'Could not end call')}
                >
                  <Icon name="call" size={22} color={colors.white} />
                </TouchableOpacity>
              </>
            ) : isClosing ? (
              <TouchableOpacity accessibilityRole="button" style={styles.closeButton} onPress={clearCall}>
                <AppText style={styles.closeButtonText}>{ui("Close")}</AppText>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                accessibilityRole="button"
                style={[styles.endButton, styles.rejectWideButton]}
                onPress={() => safeAction(hangUp, 'Could not cancel call')}
              >
                <Icon name="close" size={18} color={colors.white} />
                <AppText style={styles.endButtonText}>{ui("Cancel request")}</AppText>
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
    fontSize: typeScale.sm,
    lineHeight: 20,
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
  participantGrid: {
    position: 'absolute',
    bottom: 18,
    left: 18,
    right: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  participantTile: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 10,
    alignItems: 'center',
    position: 'relative',
  },
  primaryParticipantTile: {
    borderWidth: 2,
  },
  removeParticipantButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: 12,
    height: 22,
    justifyContent: 'center',
    position: 'absolute',
    right: 6,
    top: 6,
    width: 22,
  },
  transferHostButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    borderRadius: 12,
    height: 22,
    justifyContent: 'center',
    position: 'absolute',
    left: 6,
    top: 6,
    width: 22,
  },
  participantAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  participantAvatarText: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 11,
  },
  participantName: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
    maxWidth: '100%',
  },
  participantRole: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 2,
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
    fontSize: typeScale.xs,
    lineHeight: 18,
    letterSpacing: 0.8,
    marginTop: 18,
    textTransform: 'uppercase',
  },
  liveEyebrow: {
    color: colors.gold,
    marginTop: 'auto',
  },
  title: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: typeScale.xl,
    lineHeight: 32,
    marginTop: 6,
    textAlign: 'center',
  },
  liveTitle: {
    color: colors.white,
  },
  subtitle: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: typeScale.reading,
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
  },
  liveSubtitle: {
    color: '#CBD5E1',
  },
  propertyText: {
    color: colors.muted,
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 7,
    textAlign: 'center',
  },
  livePropertyText: {
    color: '#94A3B8',
  },
  addParticipantBlock: {
    marginTop: 12,
    width: '100%',
  },
  addParticipantButton: {
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addParticipantButtonText: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  addParticipantRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  addParticipantInput: {
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    color: '#0F172A',
    flex: 1,
    fontFamily: typography.regular,
    fontSize: typeScale.sm,
    lineHeight: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addParticipantSubmit: {
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  addParticipantSubmitText: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  historyCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderColor: 'rgba(148, 163, 184, 0.3)',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: '100%',
  },
  historyTitle: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  historyRow: {
    borderTopColor: 'rgba(148, 163, 184, 0.24)',
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 8,
  },
  historyAction: {
    color: '#E2E8F0',
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
    textTransform: 'capitalize',
  },
  historyMeta: {
    color: '#CBD5E1',
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 2,
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
    fontFamily: typography.semibold,
    fontSize: typeScale.sm,
    lineHeight: 20,
  },
  closeButton: {
    backgroundColor: colors.surfaceBlue,
    borderRadius: radius.pill,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  closeButtonText: {
    color: colors.blue,
    fontFamily: typography.semibold,
    fontSize: typeScale.sm,
    lineHeight: 20,
  },
});

export default NativeCallOverlay;
