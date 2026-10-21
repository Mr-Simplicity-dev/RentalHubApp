import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Toast from 'react-native-toast-message';
import Button from '../common/Button';
import { propertyService } from '../../services/propertyService';
import { colors, radius } from '../../theme';

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

/**
 * The guided shot list. It is the running order the landlord is prompted to
 * shoot in, and the order the server builds the automatic tour video in, so the
 * video walks in from the street and moves through the house. Keep this in step
 * with GUIDED_SHOTS in the server's propertyTourVideo.js.
 */
export const GUIDED_SHOT_PROMPTS = [
  { key: 'building_front', label: 'Front of the building', hint: 'Stand outside and face the main entrance.' },
  { key: 'compound', label: 'Compound / surroundings', hint: 'Show the yard, gate and parking space.' },
  { key: 'sitting_room', label: 'Sitting room', hint: 'Stand at the doorway and show the whole room.' },
  { key: 'kitchen', label: 'Kitchen', hint: 'Capture the counters and fittings.' },
  { key: 'bedroom', label: 'Bedroom', hint: 'Show the room and any wardrobe.' },
  { key: 'bathroom', label: 'Bathroom', hint: 'Show the fittings and water source.' },
  { key: 'toilet', label: 'Toilet', hint: 'Show the toilet and its condition.' },
  { key: 'street', label: 'Street outside', hint: 'Show the road and how the house is reached.' },
];

const LivePropertyCapture = ({ visible, photos = [], onCapture, onRemove, onClose }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [facing, setFacing] = useState('back');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (visible && permission && !permission.granted) {
      requestPermission().catch(() => {});
    }
  }, [visible, permission, requestPermission]);

  useEffect(() => {
    if (!visible) setReady(false);
  }, [visible]);

  const takePhoto = useCallback(async () => {
    if (busy || !cameraRef.current || !ready) return;

    if (photos.length >= MAX_PROPERTY_PHOTOS) {
      Toast.show({
        type: 'info',
        text1: 'Photo limit reached',
        text2: `You can capture up to ${MAX_PROPERTY_PHOTOS} property photos.`,
      });
      return;
    }

    setBusy(true);
    try {
      const shot = await cameraRef.current.takePictureAsync({ quality: 0.9, skipProcessing: false });
      if (!shot?.uri) {
        Toast.show({ type: 'error', text1: 'Could not capture photo', text2: 'Please try again.' });
        return;
      }

      // Ask for the ticket after the shutter, exactly like the web, so a token
      // can never be stockpiled and used for a gallery image later.
      const session = await propertyService.createLiveCaptureSession();
      const token = session?.data?.token;

      if (!session?.success || !token) {
        Toast.show({
          type: 'error',
          text1: 'Could not verify live capture',
          text2: 'Please retake the photo.',
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
        text1: 'Capture failed',
        text2: error?.response?.data?.message || 'Could not verify live capture. Please try again.',
      });
    } finally {
      setBusy(false);
    }
  }, [busy, ready, photos.length, onCapture]);

  const canCaptureMore = photos.length < MAX_PROPERTY_PHOTOS;
  const currentShot = GUIDED_SHOT_PROMPTS[Math.min(photos.length, GUIDED_SHOT_PROMPTS.length - 1)];

  const renderBody = () => {
    if (!permission) {
      return (
        <View style={styles.centered}>
          <AppText style={styles.centeredText}>Checking camera permission…</AppText>
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.centered}>
          <Icon name="camera-outline" size={44} color={colors.gold} />
          <AppText style={styles.centeredTitle}>Camera access needed</AppText>
          <AppText style={styles.centeredText}>
            Property photos must be taken live in the app. Allow camera access to continue.
          </AppText>
          <Button title="Allow camera access" onPress={() => requestPermission().catch(() => {})} />
        </View>
      );
    }

    return (
      <View style={styles.cameraWrap}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          mode="picture"
          onCameraReady={() => setReady(true)}
        />
        {flash ? <View style={styles.flash} /> : null}
        <View style={styles.topBar}>
          <TouchableOpacity
            accessibilityLabel="Close camera"
            onPress={onClose}
            style={styles.topButton}>
            <Icon name="close" size={22} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.counterPill}>
            <AppText style={styles.counterText}>
              {photos.length} / {MAX_PROPERTY_PHOTOS}
            </AppText>
          </View>
          <TouchableOpacity
            accessibilityLabel="Switch camera"
            onPress={() => setFacing((current) => (current === 'back' ? 'front' : 'back'))}
            style={styles.topButton}>
            <Icon name="camera-reverse-outline" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>

        {canCaptureMore ? (
          <View style={styles.promptCard} pointerEvents="none">
            <AppText style={styles.promptStep}>
              Shot {photos.length + 1} of {Math.min(MAX_PROPERTY_PHOTOS, GUIDED_SHOT_PROMPTS.length)}
            </AppText>
            <AppText style={styles.promptTitle}>{currentShot.label}</AppText>
            <AppText style={styles.promptHint}>{currentShot.hint}</AppText>
          </View>
        ) : null}

        <View style={styles.bottomBar}>
          <TouchableOpacity
            accessibilityLabel="Take photo"
            disabled={busy || !ready || !canCaptureMore}
            onPress={takePhoto}
            style={[
              styles.shutter,
              (busy || !ready || !canCaptureMore) && styles.shutterDisabled,
            ]}>
            <View style={styles.shutterInner} />
          </TouchableOpacity>
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
                  accessibilityLabel={`Remove photo ${index + 1}`}
                  onPress={() => onRemove?.(index)}
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
  centeredTitle: { color: colors.white, fontSize: 19, fontWeight: '800', marginBottom: 8, marginTop: 12 },
  centeredText: { color: '#CBD5E1', fontSize: 14, lineHeight: 20, marginBottom: 18, textAlign: 'center' },
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
  promptStep: { color: colors.gold, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  promptTitle: { color: colors.white, fontSize: 17, fontWeight: '800', marginTop: 4 },
  promptHint: { color: '#CBD5E1', fontSize: 12.5, lineHeight: 18, marginTop: 3 },
  stripLabel: {
    backgroundColor: 'rgba(11,18,32,0.82)',
    bottom: 0,
    left: 0,
    paddingHorizontal: 5,
    paddingVertical: 2,
    position: 'absolute',
    right: 0,
  },
  stripLabelText: { color: colors.white, fontSize: 9.5, fontWeight: '700' },
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
  counterText: { color: colors.white, fontSize: 13, fontWeight: '700' },
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
