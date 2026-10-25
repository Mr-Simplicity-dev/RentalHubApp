import React, { useLayoutEffect, useState } from 'react';
import {Image, ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import {
  MAX_PROPERTY_PHOTOS,
  MAX_PROPERTY_CLIPS,
  GUIDED_SHOT_PROMPTS,
} from '../../components/properties/LivePropertyCapture';
import { propertyService } from '../../services/propertyService';
import { getErrorMessage } from '../../utils/http';
import { colors, radius, shadows, typography, typeScale } from '../../theme';

import AppText from '../../components/common/AppText';
const propertyTypes = ['apartment', 'house', 'duplex', 'studio', 'bungalow', 'flat', 'room'];

const AddPropertyScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [images, setImages] = useState([]);
  const [imageCaptureTokens, setImageCaptureTokens] = useState([]);
  const [clips, setClips] = useState([]);
  const [clipCaptureTokens, setClipCaptureTokens] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    state: '',
    city: '',
    area: '',
    full_address: '',
    latitude: '',
    longitude: '',
    property_type: 'apartment',
    bedrooms: '1',
    bathrooms: '1',
    rent_amount: '',
    payment_frequency: 'yearly',
  });

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCapture = (photo, token) => {
    setImages((current) => [...current, photo]);
    setImageCaptureTokens((current) => [...current, token]);
  };

  const handleRemovePhoto = (index) => {
    setImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setImageCaptureTokens((current) => current.filter((_, tokenIndex) => tokenIndex !== index));
  };

  const handleRecordClip = (clip, token) => {
    setClips((current) => [...current, clip]);
    setClipCaptureTokens((current) => [...current, token]);
  };

  const handleRemoveClip = (index) => {
    setClips((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setClipCaptureTokens((current) => current.filter((_, tokenIndex) => tokenIndex !== index));
  };

  const handleSubmit = async () => {
    if (
      !form.title.trim() ||
      !form.description.trim() ||
      !form.state.trim() ||
      !form.city.trim() ||
      !form.area.trim() ||
      !form.rent_amount ||
      !form.latitude ||
      !form.longitude
    ) {
      Toast.show({
        type: 'error',
        text1: 'Complete required fields',
        text2: 'Title, description, location, coordinates and rent are required.',
      });
      return;
    }

    // The server refuses a listing without live photos, so catch it here with a
    // clearer message instead of letting the upload fail.
    if (images.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Add property photos',
        text2: 'Capture at least one live property photo before submitting.',
      });
      return;
    }

    if (imageCaptureTokens.length !== images.length) {
      Toast.show({
        type: 'error',
        text1: 'Retake the photos',
        text2: 'Every photo must be captured live before publishing.',
      });
      return;
    }

    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      Toast.show({ type: 'error', text1: 'Enter valid map coordinates' });
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        bedrooms: Number(form.bedrooms || 0),
        bathrooms: Number(form.bathrooms || 0),
        rent_amount: Number(form.rent_amount || 0),
        latitude,
        longitude,
        images,
        image_capture_source: 'live_camera',
        image_capture_tokens: JSON.stringify(imageCaptureTokens),
      };
      const response = await propertyService.createProperty(payload);
      if (response.success) {
        // Clips are optional; upload them after the listing exists.
        const createdId = response.data?.id || response.data?.property?.id;
        if (createdId && clips.length && clipCaptureTokens.length === clips.length) {
          try {
            await propertyService.uploadClips(createdId, clips, clipCaptureTokens, []);
          } catch (error) {
            Toast.show({
              type: 'info',
              text1: 'Property created',
              text2: 'The listing is live, but the clips could not be added.',
            });
          }
        }

        Toast.show({ type: 'success', text1: 'Property created' });
        navigation.navigate('MyProperties');
      } else {
        Toast.show({
          type: 'error',
          text1: 'Creation failed',
          text2: response.message || 'Could not create property',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Creation failed',
        text2: getErrorMessage(error, 'Could not create property'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={22} color={colors.navy} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <AppText style={styles.eyebrow}>NEW LISTING</AppText>
          <AppText style={styles.headerTitle}>Add property</AppText>
        </View>
        <View style={styles.headerSpacer} />
      </View>
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      <View style={styles.intro}>
        <View style={styles.introIcon}>
          <Icon name="business-outline" size={23} color={colors.gold} />
        </View>
        <AppText style={styles.title}>Create a verified listing</AppText>
        <AppText style={styles.subtitle}>Provide accurate property and map information for review.</AppText>
      </View>

      <AppText style={styles.sectionLabel}>PROPERTY DETAILS</AppText>
      <View style={styles.card}>
      <Input label="Title" value={form.title} onChangeText={(value) => onChange('title', value)} />
      <Input
        label="Description"
        value={form.description}
        onChangeText={(value) => onChange('description', value)}
        multiline
        numberOfLines={4}
      />
      <AppText style={styles.fieldLabel}>Property type</AppText>
      <View style={styles.chipGrid}>
        {propertyTypes.map((type) => (
          <TouchableOpacity
            key={type}
            onPress={() => onChange('property_type', type)}
            style={[styles.chip, form.property_type === type && styles.chipActive]}>
            <AppText style={[styles.chipText, form.property_type === type && styles.chipTextActive]}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.numberRow}>
        <View style={styles.numberField}>
          <Input
            label="Bedrooms"
            value={form.bedrooms}
            onChangeText={(value) => onChange('bedrooms', value)}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.numberField}>
          <Input
            label="Bathrooms"
            value={form.bathrooms}
            onChangeText={(value) => onChange('bathrooms', value)}
            keyboardType="number-pad"
          />
        </View>
      </View>
      </View>

      <AppText style={styles.sectionLabel}>PROPERTY PHOTOS</AppText>
      <View style={styles.card}>
        <AppText style={styles.fieldLabel}>Live photos</AppText>
        <AppText style={styles.photoHint}>
          Property photos must be captured live in the app. Gallery images are not accepted. Up to 8 photos. Add optional clips in photo/clip mode.
        </AppText>

        {images.length > 0 ? (
          <View style={styles.photoGrid}>
            {images.map((photo, index) => (
              <View key={`${photo.uri}-${index}`} style={styles.photoItem}>
                <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
                <TouchableOpacity
                  accessibilityLabel={`Remove photo ${index + 1}`}
                  onPress={() => handleRemovePhoto(index)}
                  style={styles.photoRemove}>
                  <Icon name="close" size={13} color={colors.white} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}

        {images.length > 0 || clips.length > 0 ? (
          <View style={styles.photoGrid}>
            {images.map((photo, index) => (
              <View key={`${photo.uri}-${index}`} style={styles.photoItem}>
                <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
                <TouchableOpacity
                  accessibilityLabel={`Remove photo ${index + 1}`}
                  onPress={() => handleRemovePhoto(index)}
                  style={styles.photoRemove}>
                  <Icon name="close" size={13} color={colors.white} />
                </TouchableOpacity>
              </View>
            ))}
            {clips.map((clip, index) => (
              <View key={`${clip.uri}-${index}`} style={styles.clipItem}>
                <View style={styles.clipIcon}>
                  <Icon name="videocam" size={16} color={colors.white} />
                </View>
                <AppText style={styles.clipLabel} numberOfLines={1}>
                  Clip {index + 1}
                </AppText>
                <TouchableOpacity
                  accessibilityLabel={`Remove clip ${index + 1}`}
                  onPress={() => handleRemoveClip(index)}
                  style={styles.photoRemove}>
                  <Icon name="close" size={13} color={colors.white} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}

        <TouchableOpacity
          accessibilityLabel="Open live camera"
          onPress={() => setCaptureOpen(true)}
          disabled={images.length >= MAX_PROPERTY_PHOTOS && clips.length >= MAX_PROPERTY_CLIPS}
          style={[
            styles.captureButton,
            images.length >= MAX_PROPERTY_PHOTOS && clips.length >= MAX_PROPERTY_CLIPS && styles.captureButtonDisabled,
          ]}>
          <Icon name="camera-outline" size={19} color={colors.white} />
          <AppText style={styles.captureButtonText}>
            {images.length === 0 && clips.length === 0
              ? 'Open live camera (Photos & Clips)'
              : `Add more (Photos ${images.length}/${MAX_PROPERTY_PHOTOS} • Clips ${clips.length}/${MAX_PROPERTY_CLIPS})`}
          </AppText>
        </TouchableOpacity>
      </View>

      <AppText style={styles.sectionLabel}>LOCATION</AppText>
      <View style={styles.card}>
      <Input label="State" value={form.state} onChangeText={(value) => onChange('state', value)} />
      <Input label="City" value={form.city} onChangeText={(value) => onChange('city', value)} />
      <Input label="Area" value={form.area} onChangeText={(value) => onChange('area', value)} />
      <Input
        label="Full address"
        value={form.full_address}
        onChangeText={(value) => onChange('full_address', value)}
        placeholder="Street and building details"
      />
      <AppText style={styles.coordinateHint}>
        Copy the latitude and longitude from the property’s Google Maps pin.
      </AppText>
      <View style={styles.numberRow}>
        <View style={styles.numberField}>
          <Input label="Latitude" value={form.latitude} onChangeText={(value) => onChange('latitude', value)} keyboardType="decimal-pad" placeholder="6.5244" />
        </View>
        <View style={styles.numberField}>
          <Input label="Longitude" value={form.longitude} onChangeText={(value) => onChange('longitude', value)} keyboardType="decimal-pad" placeholder="3.3792" />
        </View>
      </View>
      </View>

      <AppText style={styles.sectionLabel}>PRICING</AppText>
      <View style={styles.card}>
      <Input
        label="Rent Amount"
        value={form.rent_amount}
        onChangeText={(value) => onChange('rent_amount', value)}
        keyboardType="number-pad"
      />
      <AppText style={styles.fieldLabel}>Payment frequency</AppText>
      <View style={styles.frequencyRow}>
        {['monthly', 'yearly'].map((frequency) => (
          <TouchableOpacity
            key={frequency}
            onPress={() => onChange('payment_frequency', frequency)}
            style={[styles.frequency, form.payment_frequency === frequency && styles.frequencyActive]}>
            <AppText style={[styles.frequencyText, form.payment_frequency === frequency && styles.frequencyTextActive]}>
              {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>
      </View>

      <Button title="Submit for verification" onPress={handleSubmit} loading={loading} size="lg" />
      <View style={styles.reviewNote}>
        <Icon name="shield-checkmark-outline" size={17} color={colors.success} />
        <AppText style={styles.reviewText}>RentalHub reviews listings before they become publicly available.</AppText>
      </View>
    </ScrollView>

    <LivePropertyCapture
      visible={captureOpen}
      photos={images}
      onCapture={handleCapture}
      onRemove={handleRemovePhoto}
      clips={clips}
      onRecordClip={handleRecordClip}
      onRemoveClip={handleRemoveClip}
      onClose={() => setCaptureOpen(false)}
    />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  screen: { flex: 1, backgroundColor: colors.surface },
  header: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', paddingHorizontal: 18, paddingVertical: 10 },
  backButton: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.border, borderRadius: 21, borderWidth: 1, height: 42, justifyContent: 'center', width: 42 },
  headerCopy: { alignItems: 'center', flex: 1 },
  headerSpacer: { width: 42 },
  eyebrow: { color: colors.blue, fontFamily: typography.bold, fontSize: typeScale.xs, lineHeight: 18, letterSpacing: 0.8 },
  headerTitle: { color: colors.ink, fontFamily: typography.semibold, fontSize: typeScale.lg, lineHeight: 28, marginTop: 2 },
  content: { padding: 18, paddingBottom: 30 },
  intro: { backgroundColor: colors.navy, borderRadius: radius.lg, marginBottom: 23, padding: 19 },
  introIcon: { alignItems: 'center', backgroundColor: 'rgba(255,201,40,0.14)', borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  title: { color: colors.white, fontFamily: typography.semibold, fontSize: typeScale.xl, lineHeight: 32, marginTop: 14 },
  subtitle: { color: '#AFC2DF', fontFamily: typography.regular, fontSize: typeScale.reading, lineHeight: 22, marginTop: 6 },
  sectionLabel: { color: colors.blue, fontFamily: typography.bold, fontSize: typeScale.xs, lineHeight: 18, letterSpacing: 0.8, marginBottom: 8, marginLeft: 2 },
  card: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, marginBottom: 20, padding: 17, ...shadows.soft },
  fieldLabel: { color: colors.text, fontFamily: typography.semibold, fontSize: typeScale.sm, lineHeight: 20, marginBottom: 9 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 15 },
  chip: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 },
  chipActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { color: colors.text, fontFamily: typography.medium, fontSize: typeScale.xs, lineHeight: 18 },
  chipTextActive: { color: colors.white, fontFamily: typography.semibold },
  numberRow: { flexDirection: 'row', gap: 10 },
  numberField: { flex: 1 },
  coordinateHint: { color: colors.muted, fontFamily: typography.regular, fontSize: typeScale.reading, lineHeight: 22, marginBottom: 10 },
  clipItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(11,18,32,0.82)',
    borderRadius: radius.md,
    height: 74,
    justifyContent: 'center',
    width: 74,
  },
  clipIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  clipLabel: { color: colors.white, fontFamily: typography.semibold, fontSize: typeScale.xs, lineHeight: 18, marginTop: 3 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 13 },
  photoItem: { height: 74, width: 74 },
  photoThumb: { borderRadius: radius.md, height: '100%', width: '100%' },
  photoRemove: {
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
  captureButton: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  captureButtonDisabled: { opacity: 0.55 },
  captureButtonText: { color: colors.white, fontFamily: typography.semibold, fontSize: typeScale.sm, lineHeight: 20, marginLeft: 8 },
  frequencyRow: { flexDirection: 'row', gap: 10 },
  frequency: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flex: 1, paddingVertical: 12 },
  frequencyActive: { backgroundColor: colors.surfaceBlue, borderColor: colors.blue },
  frequencyText: { color: colors.text, fontFamily: typography.medium, fontSize: typeScale.xs, lineHeight: 18 },
  frequencyTextActive: { color: colors.blue, fontFamily: typography.semibold },
  reviewNote: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'center', marginTop: 15, paddingHorizontal: 8 },
  reviewText: { color: colors.muted, flex: 1, fontFamily: typography.medium, fontSize: typeScale.xs, lineHeight: 18, marginLeft: 7 },
});

export default AddPropertyScreen;
