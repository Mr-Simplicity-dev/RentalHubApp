import React, { useLayoutEffect, useState } from 'react';
import { ScrollView, Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { propertyService } from '../../services/propertyService';
import { getErrorMessage } from '../../utils/http';
import { colors, radius, shadows, typography } from '../../theme';

const propertyTypes = ['apartment', 'house', 'duplex', 'studio', 'bungalow', 'flat', 'room'];

const AddPropertyScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
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
      };
      const response = await propertyService.createProperty(payload);
      if (response.success) {
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
          <Text style={styles.eyebrow}>NEW LISTING</Text>
          <Text style={styles.headerTitle}>Add property</Text>
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
        <Text style={styles.title}>Create a verified listing</Text>
        <Text style={styles.subtitle}>Provide accurate property and map information for review.</Text>
      </View>

      <Text style={styles.sectionLabel}>PROPERTY DETAILS</Text>
      <View style={styles.card}>
      <Input label="Title" value={form.title} onChangeText={(value) => onChange('title', value)} />
      <Input
        label="Description"
        value={form.description}
        onChangeText={(value) => onChange('description', value)}
        multiline
        numberOfLines={4}
      />
      <Text style={styles.fieldLabel}>Property type</Text>
      <View style={styles.chipGrid}>
        {propertyTypes.map((type) => (
          <TouchableOpacity
            key={type}
            onPress={() => onChange('property_type', type)}
            style={[styles.chip, form.property_type === type && styles.chipActive]}>
            <Text style={[styles.chipText, form.property_type === type && styles.chipTextActive]}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
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

      <Text style={styles.sectionLabel}>LOCATION</Text>
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
      <Text style={styles.coordinateHint}>
        Copy the latitude and longitude from the property’s Google Maps pin.
      </Text>
      <View style={styles.numberRow}>
        <View style={styles.numberField}>
          <Input label="Latitude" value={form.latitude} onChangeText={(value) => onChange('latitude', value)} keyboardType="decimal-pad" placeholder="6.5244" />
        </View>
        <View style={styles.numberField}>
          <Input label="Longitude" value={form.longitude} onChangeText={(value) => onChange('longitude', value)} keyboardType="decimal-pad" placeholder="3.3792" />
        </View>
      </View>
      </View>

      <Text style={styles.sectionLabel}>PRICING</Text>
      <View style={styles.card}>
      <Input
        label="Rent Amount"
        value={form.rent_amount}
        onChangeText={(value) => onChange('rent_amount', value)}
        keyboardType="number-pad"
      />
      <Text style={styles.fieldLabel}>Payment frequency</Text>
      <View style={styles.frequencyRow}>
        {['monthly', 'yearly'].map((frequency) => (
          <TouchableOpacity
            key={frequency}
            onPress={() => onChange('payment_frequency', frequency)}
            style={[styles.frequency, form.payment_frequency === frequency && styles.frequencyActive]}>
            <Text style={[styles.frequencyText, form.payment_frequency === frequency && styles.frequencyTextActive]}>
              {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      </View>

      <Button title="Submit for verification" onPress={handleSubmit} loading={loading} size="lg" />
      <View style={styles.reviewNote}>
        <Icon name="shield-checkmark-outline" size={17} color={colors.success} />
        <Text style={styles.reviewText}>RentalHub reviews listings before they become publicly available.</Text>
      </View>
    </ScrollView>
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
  eyebrow: { color: colors.blue, fontFamily: typography.bold, fontSize: 13, letterSpacing: 1.2 },
  headerTitle: { color: colors.ink, fontFamily: typography.bold, fontSize: 20, marginTop: 2 },
  content: { padding: 18, paddingBottom: 30 },
  intro: { backgroundColor: colors.navy, borderRadius: radius.lg, marginBottom: 23, padding: 19 },
  introIcon: { alignItems: 'center', backgroundColor: 'rgba(255,201,40,0.14)', borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  title: { color: colors.white, fontFamily: typography.bold, fontSize: 22, marginTop: 14 },
  subtitle: { color: '#AFC2DF', fontFamily: typography.regular, fontSize: 13, lineHeight: 18, marginTop: 6 },
  sectionLabel: { color: colors.blue, fontFamily: typography.bold, fontSize: 13, letterSpacing: 1.2, marginBottom: 8, marginLeft: 2 },
  card: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, marginBottom: 20, padding: 17, ...shadows.soft },
  fieldLabel: { color: colors.text, fontFamily: typography.semibold, fontSize: 14, marginBottom: 9 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 15 },
  chip: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 },
  chipActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { color: colors.text, fontFamily: typography.medium, fontSize: 13 },
  chipTextActive: { color: colors.white, fontFamily: typography.semibold },
  numberRow: { flexDirection: 'row', gap: 10 },
  numberField: { flex: 1 },
  coordinateHint: { color: colors.muted, fontFamily: typography.regular, fontSize: 13, lineHeight: 15, marginBottom: 10 },
  frequencyRow: { flexDirection: 'row', gap: 10 },
  frequency: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flex: 1, paddingVertical: 12 },
  frequencyActive: { backgroundColor: colors.surfaceBlue, borderColor: colors.blue },
  frequencyText: { color: colors.text, fontFamily: typography.medium, fontSize: 13 },
  frequencyTextActive: { color: colors.blue, fontFamily: typography.semibold },
  reviewNote: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'center', marginTop: 15, paddingHorizontal: 8 },
  reviewText: { color: colors.muted, flex: 1, fontFamily: typography.medium, fontSize: 13, lineHeight: 15, marginLeft: 7 },
});

export default AddPropertyScreen;
