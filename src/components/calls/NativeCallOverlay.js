import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import useCallSounds from '../../hooks/useCallSounds';
import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import TextInput from '../common/AppTextInput';
import AppText from '../common/AppText';
import { createNativeCallMedia } from '../../services/nativeCallMediaService';
import { AUDIO_ROUTE_EVENT, subscribeAudioRouteChanges } from '../../services/nativeAudioRouteService';
import { useRealtime } from '../../context/RealtimeContext';
import { AuthContext } from '../../context/AuthContext';
import { voiceMonitorService } from '../../services/voiceMonitorService';
import { colors, radius, shadows, typography, typeScale } from '../../theme';

let RTCView = null;
let ScreenCapturePickerView = null;
try {
  const WebRTC = require('react-native-webrtc');
  RTCView = WebRTC.RTCView;
  ScreenCapturePickerView = WebRTC.ScreenCapturePickerView;
} catch (_error) {
  // WebRTC native code is optional at module load so the UI can explain call failures.
}

const ENDED_STATUSES = ['rejected', 'missed', 'ended'];

const callTitle = (call = {}) => {
  if (call.isSupport) return ui('Support call');
  if (call.callType === 'virtual_tour') return ui('Virtual property tour');
  if (call.callType === 'video') return ui('Video call');
  return ui('Audio call');
};

const otherPartyName = (call = {}) => {
  if (!call) return ui('RentalHub user');
  return call.direction === 'incoming'
    ? call.caller?.full_name || call.caller?.name || ui('RentalHub user')
    : call.receiver?.full_name || call.receiver?.name || ui('RentalHub user');
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
      name: participant?.name || participant?.full_name || participant?.displayName || participant?.role || ui('Agent {value0}', { value0: index + 1 }),
      role: participant?.role || (index === 0 ? 'speaker' : 'listener'),
      status: participant?.status || (index === 0 ? 'connected' : 'listening'),
    }));
  }

  return [{
    id: call?.callId || 'primary-call',
    name: otherPartyName(call),
    role: call?.direction === 'incoming' ? 'caller' : 'guest',
    status: 'connected',
  }];
};

const participantRoleLabel = (role) => {
  if (role === 'speaker' || role === 'Speaker') return ui('Main speaker');
  if (role === 'listener' || role === 'Listener') return ui('Listener');
  if (role === 'caller' || role === 'Caller') return ui('Caller');
  if (role === 'guest' || role === 'Guest') return ui('Guest');
  return role || ui('Participant');
};

const participantStatusLabel = (status) => {
  if (status === 'connected' || status === 'Connected') return ui('Connected');
  if (status === 'listening' || status === 'Listening') return ui('Listening');
  return status || ui('Connected');
};

const mediaStatusLabel = (status, videoEnabled) => {
  if (status === 'connected') return ui('Connected');
  if (status === 'connecting') return ui('Connecting…');
  if (status === 'requesting_camera') return ui('Opening camera…');
  if (status === 'requesting_microphone') return ui('Opening microphone…');
  if (status === 'failed') return ui('Connection failed');
  if (videoEnabled) return ui('Video ready');
  return ui('Ready');
};

const routeLabel = (route) => {
  if (route === 'speaker') return ui('Speaker');
  if (route === 'earpiece') return ui('Earpiece');
  if (route === 'bluetooth') return ui('Bluetooth');
  if (route === 'wired') return ui('Wired audio');
  return ui('Unknown route');
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
  useInterfaceLanguage();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const compact = width < 370 || height < 680;
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
  useCallSounds(activeCall);
  const { user } = React.useContext(AuthContext);

  const pickerRef = useRef(null);
  const activeCallRef = useRef(activeCall);
  const emitSignalRef = useRef(emitCallSignal);
  const endCallRef = useRef(endCall);
  const shareTimeoutRef = useRef(null);
  const suppressShareToastRef = useRef(false);
  activeCallRef.current = activeCall;
  emitSignalRef.current = emitCallSignal;
  endCallRef.current = endCall;

  const [mediaState, setMediaState] = useState({
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
  });
  const mediaRef = useRef(null);
  if (!mediaRef.current) {
    mediaRef.current = createNativeCallMedia({
      emitSignal: (event, payload) => emitSignalRef.current?.(event, payload),
      onState: setMediaState,
      pickerRef,
    });
  }
  const media = mediaRef.current;

  const [showParticipants, setShowParticipants] = useState(false);
  const [showAudioRoutes, setShowAudioRoutes] = useState(false);
  const [participantUserId, setParticipantUserId] = useState('');
  const [recentRoomHistory, setRecentRoomHistory] = useState([]);

  const callId = activeCall?.callId;
  const callStatus = activeCall?.status;
  const callType = activeCall?.callType;
  const callDirection = activeCall?.direction;
  const displayParticipants = useMemo(() => normalizeParticipants(activeCall), [activeCall]);

  const showMediaError = useCallback((error) => {
    Toast.show({
      type: 'error',
      text1: ui('Could not start media'),
      text2: error?.message || ui('Camera or microphone permission failed.'),
    });
    const call = activeCallRef.current;
    if (call?.callId && call.status === 'accepted') {
      endCallRef.current?.(call.callId).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!callId || ENDED_STATUSES.includes(callStatus)) {
      void media.stop();
      return;
    }
    if (callStatus !== 'accepted') return;

    const call = activeCallRef.current;
    void media.start(call, { initiator: call?.direction === 'outgoing' }).catch(showMediaError);
  }, [callId, callStatus, callType, callDirection, media, showMediaError]);

  useEffect(() => {
    const unsubscribeOffer = subscribe('call:signal:offer', async ({ callId: signalCallId, description } = {}) => {
      const call = activeCallRef.current;
      if (!call || call.status !== 'accepted' || String(call.callId) !== String(signalCallId) || !description) return;
      try {
        await media.start(call, { initiator: false });
        await media.handleOffer({ callId: signalCallId, description });
      } catch (error) {
        showMediaError(error);
      }
    });

    const unsubscribeAnswer = subscribe('call:signal:answer', ({ callId: signalCallId, description } = {}) => {
      const call = activeCallRef.current;
      if (!call || String(call.callId) !== String(signalCallId) || !description) return;
      void media.handleAnswer({ callId: signalCallId, description });
    });

    const unsubscribeIce = subscribe('call:signal:ice-candidate', ({ callId: signalCallId, candidate } = {}) => {
      const call = activeCallRef.current;
      if (!call || String(call.callId) !== String(signalCallId) || !candidate) return;
      media.handleIce({ callId: signalCallId, candidate });
    });

    return () => {
      unsubscribeOffer();
      unsubscribeAnswer();
      unsubscribeIce();
    };
  }, [media, showMediaError, subscribe]);

  useEffect(() => subscribeAudioRouteChanges(() => {
    if (activeCallRef.current?.status === 'accepted') void media.refreshRoute();
  }), [media]);

  useEffect(() => {
    let isMounted = true;
    const loadRecentHistory = async () => {
      if (!user?.id) return;
      try {
        const response = await voiceMonitorService.myCallRoomHistory();
        if (isMounted) setRecentRoomHistory(Array.isArray(response?.data) ? response.data : []);
      } catch (_error) {
        if (isMounted) setRecentRoomHistory([]);
      }
    };
    void loadRecentHistory();
    return () => { isMounted = false; };
  }, [user?.id]);

  useEffect(() => () => {
    if (shareTimeoutRef.current) clearTimeout(shareTimeoutRef.current);
    void media.stop();
  }, [media]);

  useEffect(() => {
    if (!mediaState.shareEndedBySystem) return;
    Toast.show({
      type: 'info',
      text1: ui('Screen sharing stopped'),
      text2: ui('Your device ended the screen share.'),
    });
  }, [mediaState.shareEndedBySystem]);

  if (!activeCall) return null;

  const isIncoming = activeCall.direction === 'incoming' && activeCall.status === 'ringing';
  const isAccepted = activeCall.status === 'accepted';
  const isClosing = ENDED_STATUSES.includes(activeCall.status);
  const localUrl = getStreamUrl(mediaState.localVideoStream);
  const remoteUrl = getStreamUrl(mediaState.remoteStream);
  const hasRemoteVideo = Boolean(remoteUrl && mediaState.remoteStream?.getVideoTracks?.().some(
    (track) => track.readyState !== 'ended',
  ));
  const participantColors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];
  const participantSummary = displayParticipants.length > 1
    ? ui('{value0}-way support room', { value0: displayParticipants.length })
    : callTitle(activeCall);
  const availableRoutes = ['earpiece', 'speaker', 'bluetooth', 'wired'].filter(
    (route) => route === 'earpiece' || route === 'speaker' || mediaState.audioRouteAvailable.includes(route),
  );

  const safeAction = async (action, fallback) => {
    try {
      await action();
    } catch (error) {
      Toast.show({ type: 'error', text1: fallback, text2: error?.message });
    }
  };

  const toggleMicrophone = () => {
    void media.setMicrophoneEnabled(!mediaState.microphoneEnabled);
  };

  const toggleVideo = () => {
    if (mediaState.screenSharing || mediaState.screenSharePending) {
      Toast.show({ type: 'info', text1: ui('Stop screen sharing first') });
      return;
    }
    void media.setVideoEnabled(!mediaState.videoEnabled).catch((error) => {
      Toast.show({ type: 'error', text1: ui('Could not change video'), text2: error?.message });
    });
  };

  const switchCamera = () => {
    void media.switchCamera().catch((error) => {
      const message = error?.message === 'STOP_SHARING_FIRST'
        ? ui('Stop screen sharing first')
        : ui('Could not switch camera');
      Toast.show({ type: 'error', text1: message, text2: error?.message });
    });
  };

  const handleScreenShare = () => {
    if (mediaState.screenSharePending) {
      suppressShareToastRef.current = true;
      void media.cancelScreenShare();
      return;
    }
    if (mediaState.screenSharing) {
      void safeAction(() => media.stopScreenShare(), ui('Could not stop screen sharing'));
      return;
    }
    if (!mediaDevicesAvailable()) {
      Toast.show({ type: 'error', text1: ui('Screen sharing is unavailable in this app version.') });
      return;
    }

    suppressShareToastRef.current = false;
    const pending = media.startScreenShare();
    if (Platform.OS === 'ios') {
      shareTimeoutRef.current = setTimeout(() => {
        suppressShareToastRef.current = true;
        void media.cancelScreenShare();
        Toast.show({
          type: 'info',
          text1: ui('Screen sharing did not start'),
          text2: ui('Choose Amana RentalHub Screen Share in the picker, then try again.'),
        });
      }, 20000);
    }
    Promise.resolve(pending).then((started) => {
      if (started === false && Platform.OS === 'ios' && !suppressShareToastRef.current) {
        Toast.show({ type: 'info', text1: ui('Screen sharing did not start') });
      }
    }).catch((error) => {
      if (suppressShareToastRef.current) return;
      Toast.show({
        type: 'error',
        text1: error?.name === 'NotAllowedError' ? ui('Screen sharing was cancelled') : ui('Could not start screen sharing'),
        text2: error?.message,
      });
    }).finally(() => {
      if (shareTimeoutRef.current) clearTimeout(shareTimeoutRef.current);
      shareTimeoutRef.current = null;
      suppressShareToastRef.current = false;
    });
  };

  const handleAudioRoute = (route) => {
    setShowAudioRoutes(false);
    void safeAction(async () => {
      await media.setAudioRoute(route);
    }, ui('Could not change audio output'));
  };

  const hangUp = async () => {
    await media.stop();
    await endCall(activeCall.callId);
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
    } else {
      Toast.show({
        type: 'error',
        text1: ui('Could not add participant'),
        text2: response?.message || ui('Please try another user.'),
      });
    }
  };

  const handleRemoveParticipant = async (targetUserId) => {
    if (!activeCall?.callId || !targetUserId || !removeCallParticipant) return;
    const response = await removeCallParticipant({ callId: activeCall.callId, userId: Number(targetUserId) });
    if (!response?.success) {
      Toast.show({ type: 'error', text1: ui('Could not remove participant'), text2: response?.message || ui('Please try again.') });
    }
  };

  const handleTransferHost = async (targetUserId) => {
    if (!activeCall?.callId || !targetUserId || !transferCallHost) return;
    const response = await transferCallHost({ callId: activeCall.callId, userId: Number(targetUserId) });
    if (!response?.success) {
      Toast.show({ type: 'error', text1: ui('Could not transfer host'), text2: response?.message || ui('Please try again.') });
    }
  };

  const renderControl = ({
    label,
    icon,
    onPress,
    active = true,
    danger = false,
    disabled = false,
    badge,
  }) => (
    <View style={styles.controlItem}>
      <TouchableOpacity
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={[
          styles.controlCircle,
          !active && styles.controlCircleOff,
          danger && styles.controlCircleDanger,
          disabled && styles.controlCircleDisabled,
        ]}
      >
        <Icon name={icon} size={compact ? 20 : 23} color={colors.white} />
      </TouchableOpacity>
      <AppText style={styles.controlLabel} numberOfLines={1}>{label}</AppText>
      {badge ? <View style={styles.controlBadge}><AppText style={styles.controlBadgeText}>{badge}</AppText></View> : null}
    </View>
  );

  const renderParticipantPanel = () => (
    <View style={styles.panel}>
      <AppText style={styles.panelTitle}>{ui('People in this call')}</AppText>
      {displayParticipants.map((participant, index) => {
        const isHost = Number(activeCall?.hostUserId || activeCall?.caller?.id) === Number(user?.id);
        const isCurrentHost = Number(participant.id) === Number(activeCall?.hostUserId || activeCall?.caller?.id);
        const isPrimary = Number(participant.id) === Number(activeCall?.caller?.id)
          || Number(participant.id) === Number(activeCall?.receiver?.id);
        return (
          <View key={participant.id || `${participant.name}-${index}`} style={styles.participantRow}>
            <View style={[styles.participantAvatar, { backgroundColor: participantColors[index % participantColors.length] }]}>
              <AppText style={styles.participantAvatarText}>{getParticipantInitials(participant)}</AppText>
            </View>
            <View style={styles.participantDetails}>
              <AppText style={styles.participantName} numberOfLines={1}>{participant.name}</AppText>
              <AppText style={styles.participantMeta}>
                {participantRoleLabel(participant.role)} · {participantStatusLabel(participant.status)}
              </AppText>
            </View>
            {isAccepted && isHost && !isCurrentHost ? (
              <TouchableOpacity
                accessibilityLabel={ui('Make host')}
                accessibilityRole="button"
                onPress={() => void safeAction(() => handleTransferHost(participant.id), ui('Could not transfer host'))}
                style={styles.panelIconButton}
              >
                <Icon name="arrow-redo-outline" size={17} color={colors.white} />
              </TouchableOpacity>
            ) : null}
            {isAccepted && !isPrimary ? (
              <TouchableOpacity
                accessibilityLabel={ui('Remove participant')}
                accessibilityRole="button"
                onPress={() => void safeAction(() => handleRemoveParticipant(participant.id), ui('Could not remove participant'))}
                style={[styles.panelIconButton, styles.removeIconButton]}
              >
                <Icon name="close" size={17} color={colors.white} />
              </TouchableOpacity>
            ) : null}
          </View>
        );
      })}
      {isAccepted ? (
        <View style={styles.addParticipantRow}>
          <TextInput
            value={participantUserId}
            onChangeText={setParticipantUserId}
            keyboardType="numeric"
            placeholder={ui('User ID')}
            style={styles.addParticipantInput}
            placeholderTextColor="#94a3b8"
          />
          <TouchableOpacity
            accessibilityLabel={ui('Add participant')}
            accessibilityRole="button"
            style={styles.addParticipantSubmit}
            onPress={() => void safeAction(handleAddParticipant, ui('Could not add participant'))}
          >
            <AppText style={styles.addParticipantSubmitText}>{ui('Add')}</AppText>
          </TouchableOpacity>
        </View>
      ) : null}
      {recentRoomHistory.length > 0 ? (
        <View style={styles.historyBlock}>
          <AppText style={styles.panelTitle}>{ui('Recent room activity')}</AppText>
          {recentRoomHistory.slice(0, 3).map((event) => (
            <View key={event.id || `${event.callId}-${event.createdAt}`} style={styles.historyRow}>
              <AppText style={styles.historyAction}>{String(event.action || '').replace(/_/g, ' ')}</AppText>
              <AppText style={styles.historyMeta}>
                {event.actorName || ui('Someone')} → {event.targetName || ui('Room')}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );

  const renderAudioRoutePanel = () => (
    <View style={styles.panel}>
      <AppText style={styles.panelTitle}>{ui('Audio output')}</AppText>
      {mediaState.audioRouteSupported ? availableRoutes.map((route) => (
        <TouchableOpacity
          key={route}
          accessibilityLabel={routeLabel(route)}
          accessibilityRole="button"
          accessibilityState={{ selected: mediaState.audioRoute === route }}
          onPress={() => handleAudioRoute(route)}
          style={[styles.routeRow, mediaState.audioRoute === route && styles.routeRowSelected]}
        >
          <Icon
            name={route === 'speaker' ? 'volume-high-outline' : route === 'bluetooth' ? 'bluetooth-outline' : 'ear-outline'}
            size={18}
            color={mediaState.audioRoute === route ? colors.blue : '#CBD5E1'}
          />
          <AppText style={[styles.routeLabel, mediaState.audioRoute === route && styles.routeLabelSelected]}>
            {routeLabel(route)}
          </AppText>
          {mediaState.audioRoute === route ? <Icon name="checkmark" size={18} color={colors.blue} /> : null}
        </TouchableOpacity>
      )) : (
        <AppText style={styles.panelBody}>{ui('Audio routing is not available on this device.')}</AppText>
      )}
    </View>
  );

  const renderLiveCall = () => (
    <>
      <View style={styles.videoStage}>
        {hasRemoteVideo ? (
          <RTCView mirror={false} objectFit="cover" streamURL={remoteUrl} style={styles.remoteVideo} />
        ) : (
          <View style={styles.remotePlaceholder}>
            <View style={styles.remoteAvatar}>
              <AppText style={styles.remoteAvatarText}>{getParticipantInitials({ name: otherPartyName(activeCall) })}</AppText>
            </View>
            <AppText style={styles.remoteName}>{otherPartyName(activeCall)}</AppText>
            <AppText style={styles.remoteStatus}>
              {mediaState.status === 'connected'
                ? mediaState.videoEnabled ? ui('Waiting for remote video…') : ui('Audio session connected')
                : ui('Connecting media…')}
            </AppText>
          </View>
        )}
        {localUrl && mediaState.videoEnabled ? (
          <View style={[styles.localPreview, compact && styles.localPreviewCompact]}>
            <RTCView mirror objectFit="cover" streamURL={localUrl} style={styles.localVideo} />
            <AppText style={styles.localLabel}>{ui('You')}</AppText>
          </View>
        ) : null}
      </View>

      <View style={styles.liveTopBar}>
        <View style={styles.liveIdentity}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <AppText style={styles.liveBadgeText}>{ui('LIVE')}</AppText>
          </View>
          <AppText style={styles.liveTitle} numberOfLines={1}>{participantSummary}</AppText>
          <AppText style={styles.liveSubtitle} numberOfLines={1}>
            {displayParticipants.length > 1
              ? ui('{value0} people connected', { value0: displayParticipants.length })
              : ui('With {value0}', { value0: otherPartyName(activeCall) })}
          </AppText>
          {activeCall.propertyTitle ? (
            <AppText style={styles.liveProperty} numberOfLines={1}>{activeCall.propertyTitle}</AppText>
          ) : null}
        </View>
        <TouchableOpacity
          accessibilityLabel={ui('People in this call')}
          accessibilityRole="button"
          onPress={() => {
            setShowParticipants((current) => !current);
            setShowAudioRoutes(false);
          }}
          style={styles.topButton}
        >
          <Icon name="people-outline" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      {(mediaState.screenSharing || mediaState.screenSharePending) ? (
        <View style={styles.shareBanner}>
          {mediaState.screenSharePending ? <ActivityIndicator color={colors.white} size="small" /> : <Icon name="desktop-outline" size={16} color={colors.white} />}
          <AppText style={styles.shareBannerText}>
            {mediaState.screenSharePending ? ui('Starting screen share…') : ui('You are sharing your screen')}
          </AppText>
          {mediaState.screenSharePending ? (
            <TouchableOpacity
              accessibilityLabel={ui('Cancel')}
              accessibilityRole="button"
              onPress={handleScreenShare}
              style={styles.shareCancelButton}
            >
              <AppText style={styles.shareCancelText}>{ui('Cancel')}</AppText>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <View style={styles.liveFooter}>
        {showParticipants ? renderParticipantPanel() : null}
        {showAudioRoutes ? renderAudioRoutePanel() : null}
        <View style={styles.statusRow}>
          <AppText accessibilityLiveRegion="polite" style={styles.statusText}>
            {mediaStatusLabel(mediaState.status, mediaState.videoEnabled)}
          </AppText>
          <TouchableOpacity
            accessibilityLabel={ui('Audio output')}
            accessibilityRole="button"
            onPress={() => {
              setShowAudioRoutes((current) => !current);
              setShowParticipants(false);
            }}
            style={styles.routeButton}
          >
            <Icon name="volume-high-outline" size={15} color={colors.white} />
            <AppText style={styles.routeButtonText}>{routeLabel(mediaState.audioRoute)}</AppText>
          </TouchableOpacity>
        </View>

        <View style={styles.controlBar}>
          {renderControl({
            label: mediaState.microphoneEnabled ? ui('Mute') : ui('Unmute'),
            icon: mediaState.microphoneEnabled ? 'mic-outline' : 'mic-off-outline',
            onPress: toggleMicrophone,
            active: mediaState.microphoneEnabled,
          })}
          {renderControl({
            label: mediaState.screenSharing
              ? ui('Stop sharing')
              : mediaState.videoEnabled ? ui('Camera off') : ui('Add video'),
            icon: mediaState.screenSharing
              ? 'desktop-outline'
              : mediaState.videoEnabled ? 'videocam-outline' : 'videocam-off-outline',
            onPress: mediaState.screenSharing ? handleScreenShare : toggleVideo,
            active: mediaState.videoEnabled || mediaState.screenSharing,
            disabled: mediaState.screenSharePending,
          })}
          {mediaState.videoEnabled && !mediaState.screenSharing ? renderControl({
            label: ui('Flip'),
            icon: 'camera-reverse-outline',
            onPress: switchCamera,
          }) : null}
          {renderControl({
            label: mediaState.screenSharePending
              ? ui('Cancel share')
              : mediaState.screenSharing ? ui('Stop sharing') : ui('Share screen'),
            icon: mediaState.screenSharePending ? 'close-circle-outline' : 'screen-share-outline',
            onPress: handleScreenShare,
            active: mediaState.screenSharing,
          })}
          {renderControl({
            label: ui('End'),
            icon: 'call',
            onPress: () => void safeAction(hangUp, ui('Could not end call')),
            danger: true,
          })}
        </View>
      </View>
    </>
  );

  const renderRingingCall = () => (
    <View style={styles.cardBody}>
      <View style={[styles.iconWrap, isAccepted && styles.iconWrapLive]}>
        <Icon
          name={callType === 'video' || callType === 'virtual_tour' ? 'videocam-outline' : 'call-outline'}
          size={32}
          color={isClosing ? colors.muted : colors.blue}
        />
      </View>
      <AppText style={styles.eyebrow}>{isClosing ? ui('Call ended') : ui('INCOMING CALL')}</AppText>
      <AppText style={styles.title}>{participantSummary}</AppText>
      <AppText style={styles.subtitle}>
        {isIncoming
          ? ui('{value0} is requesting this session.', { value0: otherPartyName(activeCall) })
          : displayParticipants.length > 1
            ? ui('{value0} active participants in this call room.', { value0: displayParticipants.length })
            : ui('With {value0}', { value0: otherPartyName(activeCall) })}
      </AppText>
      {activeCall.propertyTitle ? <AppText style={styles.propertyText}>{activeCall.propertyTitle}</AppText> : null}

      {isIncoming ? (
        <View style={styles.actions}>
          <TouchableOpacity
            accessibilityLabel={ui('Reject call')}
            accessibilityRole="button"
            style={[styles.roundButton, styles.rejectButton]}
            onPress={() => void safeAction(() => rejectCall(activeCall.callId), ui('Could not reject call'))}
          >
            <Icon name="close" size={24} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel={ui('Accept call')}
            accessibilityRole="button"
            style={[styles.roundButton, styles.acceptButton]}
            onPress={() => void safeAction(() => acceptCall(activeCall.callId), ui('Could not accept call'))}
          >
            <Icon name="call" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      ) : isClosing ? (
        <TouchableOpacity accessibilityRole="button" style={styles.closeButton} onPress={clearCall}>
          <AppText style={styles.closeButtonText}>{ui('Close')}</AppText>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.endButton, styles.rejectWideButton]}
          onPress={() => void safeAction(hangUp, ui('Could not cancel call'))}
        >
          <Icon name="close" size={18} color={colors.white} />
          <AppText style={styles.endButtonText}>{ui('Cancel request')}</AppText>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <Modal transparent animationType="fade" visible statusBarTranslucent>
      {Platform.OS === 'ios' && ScreenCapturePickerView ? (
        <View pointerEvents="none" style={styles.hiddenPicker}>
          <ScreenCapturePickerView ref={pickerRef} style={styles.hiddenPicker} />
        </View>
      ) : null}
      <View
        style={[
          styles.backdrop,
          isAccepted && styles.liveBackdrop,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <View style={[styles.card, isAccepted && styles.liveCard]}>
          {isAccepted ? renderLiveCall() : renderRingingCall()}
        </View>
      </View>
    </Modal>
  );
};

const mediaDevicesAvailable = () => {
  try {
    const WebRTC = require('react-native-webrtc');
    return Boolean(WebRTC?.mediaDevices?.getDisplayMedia);
  } catch (_error) {
    return false;
  }
};

const styles = StyleSheet.create({
  hiddenPicker: {
    height: 1,
    opacity: 0,
    position: 'absolute',
    width: 1,
  },
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(7, 26, 61, 0.72)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  liveBackdrop: {
    backgroundColor: '#020817',
    paddingHorizontal: 0,
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    maxWidth: 430,
    paddingVertical: 24,
    width: '100%',
    ...shadows.soft,
  },
  liveCard: {
    alignItems: 'stretch',
    backgroundColor: '#020817',
    borderRadius: 0,
    flex: 1,
    justifyContent: 'flex-start',
    maxWidth: undefined,
    paddingVertical: 0,
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
    paddingHorizontal: 28,
  },
  remoteAvatar: {
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.28)',
    borderColor: 'rgba(255, 255, 255, 0.24)',
    borderRadius: 52,
    borderWidth: 2,
    height: 104,
    justifyContent: 'center',
    width: 104,
  },
  remoteAvatarText: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 36,
  },
  remoteName: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: typeScale.xl,
    marginTop: 18,
    textAlign: 'center',
  },
  remoteStatus: {
    color: '#CBD5E1',
    fontFamily: typography.regular,
    fontSize: typeScale.sm,
    lineHeight: 20,
    marginTop: 6,
    textAlign: 'center',
  },
  localPreview: {
    backgroundColor: '#111827',
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    borderWidth: 2,
    height: 150,
    overflow: 'hidden',
    position: 'absolute',
    right: 18,
    top: 108,
    width: 112,
  },
  localPreviewCompact: {
    height: 112,
    right: 12,
    top: 96,
    width: 84,
  },
  localVideo: {
    ...StyleSheet.absoluteFillObject,
  },
  localLabel: {
    backgroundColor: 'rgba(2, 8, 23, 0.7)',
    borderRadius: 8,
    bottom: 6,
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: 10,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    position: 'absolute',
  },
  liveTopBar: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingTop: 14,
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 3,
  },
  liveIdentity: {
    flex: 1,
    marginRight: 12,
  },
  liveBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.22)',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveDot: {
    backgroundColor: '#EF4444',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  liveBadgeText: {
    color: '#FECACA',
    fontFamily: typography.bold,
    fontSize: 10,
    letterSpacing: 1,
  },
  liveTitle: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: typeScale.lg,
    lineHeight: 26,
    marginTop: 8,
  },
  liveSubtitle: {
    color: '#CBD5E1',
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  liveProperty: {
    color: '#93C5FD',
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  topButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  shareBanner: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    position: 'absolute',
    top: 92,
    zIndex: 4,
  },
  shareBannerText: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
  },
  shareCancelButton: {
    marginLeft: 4,
  },
  shareCancelText: {
    color: '#93C5FD',
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
  },
  liveFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 18,
    paddingBottom: 6,
    zIndex: 3,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statusText: {
    color: '#E2E8F0',
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  routeButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  routeButtonText: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
  },
  panel: {
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderColor: 'rgba(148, 163, 184, 0.3)',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    maxHeight: 320,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  panelTitle: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: typeScale.xs,
    letterSpacing: 0.6,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  panelBody: {
    color: '#CBD5E1',
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  participantRow: {
    alignItems: 'center',
    borderTopColor: 'rgba(148, 163, 184, 0.2)',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
  },
  participantAvatar: {
    alignItems: 'center',
    borderRadius: 17,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  participantAvatarText: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 12,
  },
  participantDetails: {
    flex: 1,
  },
  participantName: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  participantMeta: {
    color: '#94A3B8',
    fontFamily: typography.regular,
    fontSize: 11,
    lineHeight: 16,
  },
  panelIconButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.85)',
    borderRadius: 12,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  removeIconButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
  },
  addParticipantRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
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
    paddingVertical: 9,
  },
  addParticipantSubmit: {
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  addParticipantSubmitText: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  historyBlock: {
    borderTopColor: 'rgba(148, 163, 184, 0.2)',
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
  },
  historyRow: {
    borderTopColor: 'rgba(148, 163, 184, 0.16)',
    borderTopWidth: 1,
    marginTop: 8,
    paddingTop: 8,
  },
  historyAction: {
    color: '#E2E8F0',
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
    textTransform: 'capitalize',
  },
  historyMeta: {
    color: '#94A3B8',
    fontFamily: typography.regular,
    fontSize: 11,
    lineHeight: 16,
  },
  routeRow: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  routeRowSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
  },
  routeLabel: {
    color: '#E2E8F0',
    flex: 1,
    fontFamily: typography.regular,
    fontSize: typeScale.sm,
  },
  routeLabelSelected: {
    color: colors.white,
    fontFamily: typography.semibold,
  },
  controlBar: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  controlItem: {
    alignItems: 'center',
    minWidth: 52,
    position: 'relative',
  },
  controlCircle: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 30,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  controlCircleOff: {
    backgroundColor: 'rgba(148, 163, 184, 0.35)',
  },
  controlCircleDanger: {
    backgroundColor: colors.danger,
  },
  controlCircleDisabled: {
    opacity: 0.5,
  },
  controlLabel: {
    color: '#CBD5E1',
    fontFamily: typography.medium,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 5,
    maxWidth: 62,
    textAlign: 'center',
  },
  controlBadge: {
    backgroundColor: colors.blue,
    borderRadius: 10,
    left: 38,
    minWidth: 18,
    paddingHorizontal: 4,
    paddingVertical: 1,
    position: 'absolute',
    top: -4,
  },
  controlBadgeText: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 9,
    textAlign: 'center',
  },
  cardBody: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    width: '100%',
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
    letterSpacing: 0.8,
    lineHeight: 18,
    marginTop: 18,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: typeScale.xl,
    lineHeight: 32,
    marginTop: 6,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: typeScale.reading,
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
  },
  propertyText: {
    color: colors.muted,
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 7,
    textAlign: 'center',
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
    marginTop: 20,
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
