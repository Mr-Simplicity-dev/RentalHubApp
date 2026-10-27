import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
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
  const cameraRef = useRef(null);
  const [facing, setFacing] = useState('back');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const [mode, setMode] = useState('photo');
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const clipTimerRef = useRef(null);

  useEffect(() => {
    if (visible && permission && !permission.granted) {
      requestPermission().catch(() => {});
    }
  }, [visible, permission, requestPermission]);

  useEffect(() => {
    if (!visible) {
      setReady(false);
      setMode('photo');
      setRecording(false);
      setSeconds(0);
    }
  }, [visible]);

  useEffect(
    () => () => {
      if (clipTimerRef.current) clearInterval(clipTimerRef.current);
    },
    []
  );

  const takePhoto = useCallback(async () => {
    if (busy || !cameraRef.current || !ready) return;

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
        Toast.show({ type: 'error', text1: ui("Could not capture photo"), text2: ui("Please try again.") });
        return;
      }

      // Ask for the ticket after the shutter, exactly like the web, so a token
      // can never be stockpiled and used for a gallery image later.
      const session = await propertyService.createLiveCaptureSession();
      const token = session?.data?.token;

      if (!session?.success || !token) {
        Toast.show({
          type: 'error',
          text1: ui("Could not verify live capture"),
          text2: ui("Please retake the photo."),
        });
        return;
      }

      setFlash(true);
      setTimeout(() => setFlash(false), 140);

      onCapture?.(
        {
          uri: shot.uri,
          type: 'image/jpeg',
          fileName: `property-live-${Date.now()}-${photos.length + 1}.jpg`,
        },
        token
      );
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Capture failed"),
        text2: error?.response?.data?.message || ui("Could not verify live capture. Please try again."),
      });
    } finally {
      setBusy(false);
    }
  }, [busy, ready, photos.length, onCapture]);

  const startRecording = useCallback(async () => {
    if (busy || recording || !cameraRef.current || !ready) return;

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
    setSeconds(0);

    clipTimerRef.current = setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);

    try {
      const clip = await cameraRef.current.recordAsync({ maxDuration: MAX_CLIP_SECONDS });
      if (!clip?.uri) {
        Toast.show({ type: 'error', text1: ui("Could not record clip"), text2: ui("Please try again.") });
        return;
      }

      // Same rule as the photos: the ticket is asked for after the recording.
      const session = await propertyService.createLiveCaptureSession();
      const token = session?.data?.token;

      if (!session?.success || !token) {
        Toast.show({
          type: 'error',
          text1: ui("Could not verify live capture"),
          text2: ui("Please record the clip again."),
        });
        return;
      }

      onRecordClip?.(
        {
          uri: clip.uri,
          type: 'video/mp4',
          fileName: `property-clip-${Date.now()}.mp4`,
        },
        token
      );
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Recording failed"),
        text2: error?.response?.data?.message || ui("Could not record the clip. Please try again."),
      });
    } finally {
      if (clipTimerRef.current) {
        clearInterval(clipTimerRef.current);
        clipTimerRef.current = null;
      }
      setRecording(false);
      setSeconds(0);
      setBusy(false);
    }
  }, [busy, clips.length, onRecordClip, ready, recording]);

  const stopRecording = useCallback(() => {
    if (!recording || !cameraRef.current) return;
    try {
      cameraRef.current.stopRecording();
    } catch (error) {
      // stopRecording throws if the recorder already finished on its own.
    }
  }, [recording]);

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
          <Button title={ui("Allow camera access")} onPress={() => requestPermission().catch(() => {})} />
        </View>
      );
    }

    return (
      <View style={styles.cameraWrap}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          mode={mode === 'clip' ? 'video' : 'picture'}
          onCameraReady={() => setReady(true)}
        />
        {flash ? <View style={styles.flash} /> : null}
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
              onPress={() => setMode('photo')}
              style={[styles.modeButton, mode === 'photo' && styles.modeButtonActive]}>
              <AppText style={[styles.modeText, mode === 'photo' && styles.modeTextActive]}>{ui("Photo")}</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel={ui("Clip mode")}
              disabled={recording}
              onPress={() => setMode('clip')}
              style={[styles.modeButton, mode === 'clip' && styles.modeButtonActive]}>
              <AppText style={[styles.modeText, mode === 'clip' && styles.modeTextActive]}>{ui("Clip")}</AppText>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            accessibilityLabel={ui("Switch camera")}
            onPress={() => setFacing((current) => (current === 'back' ? 'front' : 'back'))}
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
              {recording ? ui("Recording... {value0}s / {value1}s", {value0: (seconds), value1: (MAX_CLIP_SECONDS)}) : 'Film a short clip'}
            </AppText>
            <AppText style={styles.promptHint}>{ui("Clips are slowed down and woven into your automatic tour video.")}</AppText>
          </View>
        ) : null}

        <View style={styles.bottomBar}>
          {mode === "photo" ? (
            <TouchableOpacity
              accessibilityLabel={ui("Take photo")}
              disabled={busy || !ready || !canCaptureMore}
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
              disabled={(!ready || !canRecordMore) || (!recording && busy)}
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
