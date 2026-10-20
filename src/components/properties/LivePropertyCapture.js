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
