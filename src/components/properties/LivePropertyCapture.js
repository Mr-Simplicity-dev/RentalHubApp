import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Linking, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import Toast from 'react-native-toast-message';
import Button from '../common/Button';
import { propertyService } from '../../services/propertyService';
import { colors, radius, typeScale } from '../../theme';

import AppText from '../common/AppText';

/**
 * Live property photo capture.
 *
 * The web only accepts photos taken through the on-page camera, and every
 * photo carries a one-use capture ticket issued by the server. A phone camera
 * has to keep that promise, so this uses expo-camera (the camera lives inside
 * the app, the gallery is not reachable) rather than the system image picker,
 * which would let any old screenshot through.
 */

export const MAX_PROPERTY_PHOTOS = 8;
export const MAX_PROPERTY_CLIPS = 4;
export const MAX_CLIP_SECONDS = 6;

/**
 * The guided shot list. It is the running order the landlord is prompted to
 * shoot in, and the order the server builds the automatic tour video in, so the
 * video walks in from the street and moves through the house. Keep this in step
 * with GUIDED_SHOTS in the server's propertyTourVideo.js.
 */
export const GUIDED_SHOT_PROMPTS = [
  { key: 'building_front', get "label"() { return ui("Front of the building"); }, get "hint"() { return ui("Stand outside and face the main entrance."); } },
  { key: 'compound', get "label"() { return ui("Compound / surroundings"); }, get "hint"() { return ui("Show the yard, gate and parking space."); } },
  { key: 'sitting_room', get "label"() { return ui("Sitting room"); }, get "hint"() { return ui("Stand at the doorway and show the whole room."); } },
  { key: 'kitchen', get "label"() { return ui("Kitchen"); }, get "hint"() { return ui("Capture the counters and fittings."); } },
  { key: 'bedroom', get "label"() { return ui("Bedroom"); }, get "hint"() { return ui("Show the room and any wardrobe."); } },
  { key: 'bathroom', get "label"() { return ui("Bathroom"); }, get "hint"() { return ui("Show the fittings and water source."); } },
  { key: 'toilet', get "label"() { return ui("Toilet"); }, get "hint"() { return ui("Show the toilet and its condition."); } },
  { key: 'street', get "label"() { return ui("Street outside"); }, get "hint"() { return ui("Show the road and how the house is reached."); } },
];

const LivePropertyCapture = ({
  visible,
  photos = [],
  onCapture,
  onRemove,
  clips = [],
  onRecordClip,
  onRemoveClip,
  onClose,
}) => {
  useInterfaceLanguage();
  const [permission, requestPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const cameraRef = useRef(null);
  const cameraPermissionPromptedRef = useRef(false);
  const recordingCancelledRef = useRef(false);
  const recordingRef = useRef(false);
  const [facing, setFacing] = useState('back');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const [mode, setMode] = useState('photo');
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [cameraError, setCameraError] = useState('');
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [pendingClip, setPendingClip] = useState(null);
  const clipTimerRef = useRef(null);

  useEffect(() => {
    if (!visible) {
      cameraPermissionPromptedRef.current = false;
      recordingCancelledRef.current = true;
      setReady(false);
      setMode('photo');
      setRecording(false);
      setSeconds(0);
      if (recordingRef.current && cameraRef.current) {
        try {
          cameraRef.current.stopRecording();
        } catch (error) {
          setCameraError(error?.message || ui('Could not stop the camera recording.'));
        }
      }
      return;
    }
    if (!permission || permission.granted || cameraPermissionPromptedRef.current) return;
    cameraPermissionPromptedRef.current = true;
    requestPermission()
      .then((result) => {
        if (!result.granted) {
          setCameraError(ui('Camera access is required. Allow it in Settings to take property photos.'));
        }
      })
      .catch((error) => {
        setCameraError(error?.message || ui('Could not request camera permission. Try again.'));
      });
  }, [visible, permission, requestPermission]);

  useEffect(
    () => () => {
      if (clipTimerRef.current) clearInterval(clipTimerRef.current);
    },
    []
  );

  const verifyPendingPhoto = useCallback(async (photo) => {
    setBusy(true);
    setCameraError('');
    try {
      const session = await propertyService.createLiveCaptureSession();
      const token = session?.data?.token;
      if (!session?.success || !token) {
        setCameraError(ui('Could not verify the captured photo. It is preserved; retry verification or discard it.'));
        return false;
      }
      onCapture?.(photo, token);
      setPendingPhoto(null);
      return true;
    } catch (error) {
      setCameraError(error?.response?.data?.message || error?.message || ui('Could not verify the captured photo. It is preserved; retry verification.'));
      return false;
    } finally {
      setBusy(false);
    }
  }, [onCapture]);

  const verifyPendingClip = useCallback(async (clip) => {
    setBusy(true);
    setCameraError('');
    try {
      const session = await propertyService.createLiveCaptureSession();
      const token = session?.data?.token;
      if (!session?.success || !token) {
        setCameraError(ui('Could not verify the recorded clip. It is preserved; retry verification or discard it.'));
        return false;
      }
      onRecordClip?.(clip, token);
      setPendingClip(null);
      return true;
    } catch (error) {
      setCameraError(error?.response?.data?.message || error?.message || ui('Could not verify the recorded clip. It is preserved; retry verification.'));
      return false;
    } finally {
      setBusy(false);
    }
  }, [onRecordClip]);

  const takePhoto = useCallback(async () => {
    if (busy || !cameraRef.current || !ready) return;
    if (pendingPhoto) return;

    if (photos.length >= MAX_PROPERTY_PHOTOS) {
      Toast.show({
        type: 'info',
        text1: ui("Photo limit reached"),
        text2: ui("You can capture up to {value0} property photos.", {value0: (MAX_PROPERTY_PHOTOS)}),
      });
      return;
    }

    setBusy(true);
    try {
      const shot = await cameraRef.current.takePictureAsync({ quality: 0.9, skipProcessing: false });
      if (!shot?.uri) {
        setCameraError(ui('Could not capture the photo. Please try again.'));
        return;
      }

      const photo = {
        uri: shot.uri,
        type: 'image/jpeg',
        fileName: `property-live-${Date.now()}-${photos.length + 1}.jpg`,
      };
      setPendingPhoto(photo);
      await verifyPendingPhoto(photo);

      setFlash(true);
      setTimeout(() => setFlash(false), 140);
    } catch (error) {
      setCameraError(error?.response?.data?.message || error?.message || ui('Photo capture failed. Please try again.'));
    } finally {
      setBusy(false);
    }
  }, [busy, pendingPhoto, ready, photos.length, verifyPendingPhoto]);

  const startRecording = useCallback(async () => {
    if (busy || recording || !cameraRef.current || !ready) return;
    if (pendingClip) return;

    if (clips.length >= MAX_PROPERTY_CLIPS) {
      Toast.show({
        type: 'info',
        text1: ui("Clip limit reached"),
        text2: ui("You can record up to {value0} property clips.", {value0: (MAX_PROPERTY_CLIPS)}),
      });
      return;
    }

    setBusy(true);
    setRecording(true);
    recordingRef.current = true;
    recordingCancelledRef.current = false;
    setSeconds(0);
    setCameraError('');

    clipTimerRef.current = setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);

    let capturedClip = null;
    try {
      const clip = await cameraRef.current.recordAsync({ maxDuration: MAX_CLIP_SECONDS });
      if (recordingCancelledRef.current) return;
      if (!clip?.uri) {
        setCameraError(ui('Could not record the clip. Check camera and microphone access, then try again.'));
        return;
      }

      capturedClip = {
        uri: clip.uri,
        type: 'video/mp4',
        fileName: `property-clip-${Date.now()}.mp4`,
      };
      setPendingClip(capturedClip);
      await verifyPendingClip(capturedClip);
    } catch (error) {
      if (capturedClip) setPendingClip(capturedClip);
      setCameraError(error?.response?.data?.message || error?.message || ui('Could not record the clip. Please try again.'));
    } finally {
      if (clipTimerRef.current) {
        clearInterval(clipTimerRef.current);
        clipTimerRef.current = null;
      }
      setRecording(false);
      recordingRef.current = false;
      setSeconds(0);
      setBusy(false);
    }
  }, [busy, clips.length, pendingClip, ready, recording, verifyPendingClip]);

  const stopRecording = useCallback(() => {
    if (!recording || !cameraRef.current) return;
    try {
      cameraRef.current.stopRecording();
    } catch (error) {
      setCameraError(error?.message || ui('Could not stop the recording. Please close and reopen the camera.'));
    }
  }, [recording]);

  const selectMode = useCallback(async (nextMode) => {
    setCameraError('');
    setReady(false);
    if (nextMode === 'clip' && !microphonePermission?.granted) {
      try {
        const result = await requestMicrophonePermission();
        if (!result.granted) {
          setCameraError(
            result.canAskAgain
              ? ui('Microphone access is required to record property clips.')
              : ui('Microphone access is blocked. Allow it in Settings to record clips.')
          );
          return;
        }
      } catch (error) {
        setCameraError(error?.message || ui('Could not request microphone permission.'));
        return;
      }
    }
    setMode(nextMode);
  }, [microphonePermission, requestMicrophonePermission]);

  const openAppSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      setCameraError(error?.message || ui('Could not open app settings.'));
    }
  }, []);

  const canCaptureMore = photos.length < MAX_PROPERTY_PHOTOS;
  const canRecordMore = clips.length < MAX_PROPERTY_CLIPS;
  const currentShot = GUIDED_SHOT_PROMPTS[Math.min(photos.length, GUIDED_SHOT_PROMPTS.length - 1)];

  const renderBody = () => {
    if (!permission) {
      return (
        <View style={styles.centered}>
          <AppText style={styles.centeredText}>{ui("Checking camera permission…")}</AppText>
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.centered}>
          <Icon name="camera-outline" size={44} color={colors.gold} />
          <AppText style={styles.centeredTitle}>{ui("Camera access needed")}</AppText>
          <AppText style={styles.centeredText}>{ui("Property photos must be taken live in the app. Allow camera access to continue.")}</AppText>
          <Button
            title={permission.canAskAgain ? ui("Allow camera access") : ui("Open app settings")}
            onPress={permission.canAskAgain
              ? () => requestPermission().then((result) => {
                if (!result.granted) setCameraError(ui('Camera permission is required to continue.'));
              }).catch((error) => setCameraError(error?.message || ui('Could not request camera permission.')))
              : openAppSettings}
          />
          {cameraError ? <AppText style={styles.errorText}>{cameraError}</AppText> : null}
        </View>
      );
    }

    return (
      <View style={styles.cameraWrap}>
        <CameraView
          ref={cameraRef}
          key={`${facing}-${mode}`}
          style={StyleSheet.absoluteFill}
          facing={facing}
          mode={mode === 'clip' ? 'video' : 'picture'}
          onCameraReady={() => {
            setReady(true);
            setCameraError('');
          }}
          onMountError={(event) => {
            setReady(false);
            setCameraError(event?.message || ui('Could not start the camera. Close other camera apps and retry.'));
          }}
        />
        {flash ? <View style={styles.flash} /> : null}
        {cameraError ? (
          <View style={styles.cameraError} accessibilityRole="alert">
            <AppText style={styles.errorText}>{cameraError}</AppText>
            {pendingPhoto ? (
              <View style={styles.errorActions}>
                <TouchableOpacity onPress={() => verifyPendingPhoto(pendingPhoto)} disabled={busy}>
                  <AppText style={styles.errorAction}>{ui('Retry photo verification')}</AppText>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPendingPhoto(null)} disabled={busy}>
                  <AppText style={styles.errorAction}>{ui('Discard photo')}</AppText>
                </TouchableOpacity>
              </View>
            ) : null}
            {pendingClip ? (
              <View style={styles.errorActions}>
                <TouchableOpacity onPress={() => verifyPendingClip(pendingClip)} disabled={busy}>
                  <AppText style={styles.errorAction}>{ui('Retry clip verification')}</AppText>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPendingClip(null)} disabled={busy}>
                  <AppText style={styles.errorAction}>{ui('Discard clip')}</AppText>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ) : null}
        <View style={styles.topBar}>
          <TouchableOpacity
            accessibilityLabel={ui("Close camera")}
            onPress={onClose}
            style={styles.topButton}>
            <Icon name="close" size={22} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.modePill}>
            <TouchableOpacity
              accessibilityLabel={ui("Photo mode")}
              disabled={recording}
              onPress={() => selectMode('photo')}
              style={[styles.modeButton, mode === 'photo' && styles.modeButtonActive]}>
              <AppText style={[styles.modeText, mode === 'photo' && styles.modeTextActive]}>{ui("Photo")}</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel={ui("Clip mode")}
              disabled={recording}
              onPress={() => selectMode('clip')}
              style={[styles.modeButton, mode === 'clip' && styles.modeButtonActive]}>
              <AppText style={[styles.modeText, mode === 'clip' && styles.modeTextActive]}>{ui("Clip")}</AppText>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            accessibilityLabel={ui("Switch camera")}
            onPress={() => {
              setReady(false);
              setCameraError('');
              setFacing((current) => (current === 'back' ? 'front' : 'back'));
            }}
            style={styles.topButton}>
            <Icon name="camera-reverse-outline" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>

        {mode === "photo" && canCaptureMore ? (
          <View style={styles.promptCard} pointerEvents="none">
            <AppText style={styles.promptStep}>{ui("Shot")}{photos.length + 1}{ui(" of ")}{Math.min(MAX_PROPERTY_PHOTOS, GUIDED_SHOT_PROMPTS.length)}
            </AppText>
            <AppText style={styles.promptTitle}>{currentShot.label}</AppText>
            <AppText style={styles.promptHint}>{currentShot.hint}</AppText>
          </View>
        ) : null}

        {mode === "clip" ? (
          <View style={styles.promptCard} pointerEvents="none">
            <AppText style={styles.promptStep}>{ui("Clip")}{clips.length + 1}{ui(" of ")}{MAX_PROPERTY_CLIPS}
            </AppText>
            <AppText style={styles.promptTitle}>
              {recording ? ui("Recording... {value0}s / {value1}s", {value0: (seconds), value1: (MAX_CLIP_SECONDS)}) : ui('Film a short clip')}
            </AppText>
            <AppText style={styles.promptHint}>{ui("Clips are slowed down and woven into your automatic tour video.")}</AppText>
          </View>
        ) : null}

        <View style={styles.bottomBar}>
          {mode === "photo" ? (
            <TouchableOpacity
              accessibilityLabel={ui("Take photo")}
              disabled={busy || !ready || !canCaptureMore || Boolean(pendingPhoto)}
              onPress={takePhoto}
              style={[
                styles.shutter,
                (busy || !ready || !canCaptureMore) && styles.shutterDisabled,
              ]}>
              <View style={styles.shutterInner} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              accessibilityLabel={recording ? 'Stop recording' : 'Record clip'}
              disabled={(!ready || !canRecordMore || Boolean(pendingClip)) || (!recording && busy)}
              onPress={recording ? stopRecording : startRecording}
              style={[
                styles.shutter,
                styles.shutterClip,
                recording && styles.shutterRecording,
                !ready || !canRecordMore ? styles.shutterDisabled : null,
              ]}>
              <View style={recording ? styles.stopInner : styles.recordInner} />
            </TouchableOpacity>
          )}
        </View>

        {photos.length > 0 ? (
          <View style={styles.strip}>
            {photos.map((photo, index) => (
              <View key={`${photo.uri}-${index}`} style={styles.stripItem}>
                <Image source={{ uri: photo.uri }} style={styles.stripImage} />
                {GUIDED_SHOT_PROMPTS[index] ? (
                  <View style={styles.stripLabel}>
                    <AppText style={styles.stripLabelText} numberOfLines={1}>
                      {index + 1}. {GUIDED_SHOT_PROMPTS[index].label}
                    </AppText>
                  </View>
                ) : null}
                <TouchableOpacity
                  accessibilityLabel={ui("Remove photo {value0}", {value0: (index + 1)})}
                  onPress={() => onRemove?.(index)}
                  style={styles.stripRemove}>
                  <Icon name="close" size={13} color={colors.white} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}

        {clips.length > 0 ? (
          <View style={styles.clipStrip}>
            {clips.map((clip, index) => (
              <View key={`${clip.uri}-${index}`} style={styles.clipItem}>
                <View style={styles.clipIcon}>
                  <Icon name="videocam" size={16} color={colors.white} />
                </View>
                <AppText style={styles.clipLabel} numberOfLines={1}>{ui("Clip")}{index + 1}
                </AppText>
                <TouchableOpacity
                  accessibilityLabel={ui("Remove clip {value0}", {value0: (index + 1)})}
                  onPress={() => onRemoveClip?.(index)}
                  style={styles.stripRemove}>
                  <Icon name="close" size={13} color={colors.white} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <View style={styles.root}>{renderBody()}</View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { backgroundColor: '#000', flex: 1 },
  centered: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 26 },
  centeredTitle: { color: colors.white, fontSize: typeScale.md, lineHeight: 26, fontWeight: '800', marginBottom: 8, marginTop: 12 },
  centeredText: { color: '#CBD5E1', fontSize: typeScale.sm, lineHeight: 20, marginBottom: 18, textAlign: 'center' },
  errorText: { color: '#FECACA', fontSize: typeScale.sm, lineHeight: 20, textAlign: 'center' },
  cameraError: { backgroundColor: 'rgba(127,29,29,0.94)', borderRadius: radius.md, left: 16, padding: 12, position: 'absolute', right: 16, top: 104, zIndex: 2 },
  errorActions: { alignItems: 'center', flexDirection: 'row', gap: 18, justifyContent: 'center', marginTop: 10 },
  errorAction: { color: colors.white, fontSize: typeScale.xs, fontWeight: '700', textDecorationLine: 'underline' },
  cameraWrap: { flex: 1 },
  flash: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.white },
  // Guided prompt sits mid-frame so the landlord reads it while composing the shot.
  promptCard: {
    alignSelf: 'center',
    backgroundColor: 'rgba(11,18,32,0.78)',
    borderRadius: radius.md,
    marginTop: 18,
    maxWidth: 320,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  promptStep: { color: colors.gold, fontSize: typeScale.xs, lineHeight: 18, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  promptTitle: { color: colors.white, fontSize: typeScale.base, lineHeight: 24, fontWeight: '800', marginTop: 4 },
  promptHint: { color: '#CBD5E1', fontSize: typeScale.reading, lineHeight: 22, marginTop: 3 },
  stripLabel: {
    backgroundColor: 'rgba(11,18,32,0.82)',
    bottom: 0,
    left: 0,
    paddingHorizontal: 5,
    paddingVertical: 2,
    position: 'absolute',
    right: 0,
  },
  stripLabelText: { color: colors.white, fontSize: typeScale.xs, lineHeight: 18, fontWeight: '700' },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
  },
  topButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  counterPill: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  counterText: { color: colors.white, fontSize: typeScale.xs, lineHeight: 18, fontWeight: '700' },
  modePill: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: radius.pill,
    flexDirection: 'row',
    padding: 3,
  },
  modeButton: {
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  modeButtonActive: { backgroundColor: colors.gold },
  modeText: { color: '#CBD5E1', fontSize: typeScale.xs, lineHeight: 18, fontWeight: '700' },
  modeTextActive: { color: '#0B1220' },
  clipStrip: {
    bottom: 26,
    flexDirection: 'row',
    gap: 9,
    left: 0,
    paddingHorizontal: 16,
    position: 'absolute',
    right: 0,
  },
  clipItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(11,18,32,0.82)',
    borderRadius: radius.md,
    height: 62,
    justifyContent: 'center',
    width: 72,
  },
  clipIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  clipLabel: { color: colors.white, fontSize: typeScale.xs, lineHeight: 18, fontWeight: '700', marginTop: 3 },
  bottomBar: { alignItems: 'center', bottom: 118, left: 0, position: 'absolute', right: 0 },
  shutter: {
    alignItems: 'center',
    borderColor: colors.white,
    borderRadius: 39,
    borderWidth: 4,
    height: 78,
    justifyContent: 'center',
    width: 78,
  },
  shutterDisabled: { opacity: 0.45 },
  shutterInner: { backgroundColor: colors.white, borderRadius: 30, height: 60, width: 60 },
  shutterClip: { borderColor: colors.white },
  shutterRecording: { borderColor: colors.danger },
  recordInner: { backgroundColor: colors.danger, borderRadius: 12, height: 30, width: 30 },
  stopInner: { backgroundColor: colors.danger, borderRadius: 6, height: 28, width: 28 },
  strip: {
    bottom: 26,
    flexDirection: 'row',
    gap: 9,
    left: 0,
    paddingHorizontal: 16,
    position: 'absolute',
    right: 0,
  },
  stripItem: { height: 62, width: 62 },
  stripImage: { borderRadius: radius.md, height: '100%', width: '100%' },
  stripRemove: {
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: 10,
    height: 20,
    justifyContent: 'center',
    position: 'absolute',
    right: -5,
    top: -5,
    width: 20,
  },
});

export default LivePropertyCapture;
