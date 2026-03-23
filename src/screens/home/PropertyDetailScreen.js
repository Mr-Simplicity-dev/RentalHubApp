import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import Button from '../../components/common/Button';
import { propertyService } from '../../services/propertyService';
import { applicationService } from '../../services/applicationService';
import { paymentService } from '../../services/paymentService';
import { AuthContext } from '../../context/AuthContext';
import { getErrorMessage } from '../../utils/http';

const formatCurrency = (value) => `NGN ${Number(value || 0).toLocaleString()}`;

const PropertyDetailScreen = ({ route, navigation }) => {
  const propertyId = route?.params?.id;
  const { user, isAuthenticated } = useContext(AuthContext);

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  const canViewFull = Boolean(
    isAuthenticated &&
      user?.user_type === 'tenant' &&
      (user?.subscription_active || property?.details_unlocked)
  );

  const loadProperty = async () => {
    setLoading(true);
    try {
      const response = canViewFull
        ? await propertyService.getFullPropertyDetails(propertyId)
        : await propertyService.getPropertyById(propertyId);
      setProperty(response?.data || null);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load property details'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (propertyId) {
      loadProperty();
    }
  }, [propertyId, canViewFull]);

  const handleSave = async () => {
    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }

    setSaving(true);
    try {
      await propertyService.saveProperty(propertyId);
      Toast.show({
        type: 'success',
        text1: 'Saved',
        text2: 'Property was saved to your shortlist',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not save property'),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      await applicationService.submitApplication({
        property_id: propertyId,
        message: 'Application submitted from mobile app',
      });
      Toast.show({
        type: 'success',
        text1: 'Application submitted',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not submit application'),
      });
    } finally {
      setApplying(false);
    }
  };

  const handleUnlock = async () => {
    setUnlocking(true);
    try {
      const response = await paymentService.initializePropertyUnlock(propertyId);
      if (response?.data?.authorization_url) {
        await Linking.openURL(response.data.authorization_url);
        Toast.show({
          type: 'info',
          text1: 'Payment initialized',
          text2: 'Complete payment in browser, then return and refresh details.',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Unlock failed',
        text2: getErrorMessage(error, 'Could not start unlock payment'),
      });
    } finally {
      setUnlocking(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  if (!property) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Property not found.</Text>
      </View>
    );
  }

  const cover =
    property.primary_photo ||
    property.photos?.[0]?.photo_url ||
    'https://via.placeholder.com/640x400?text=Property';

  return (
    <ScrollView style={styles.screen}>
      <Image source={{ uri: cover }} style={styles.image} />
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
        <Icon name="arrow-back" size={20} color="#0f172a" />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>{property.title}</Text>
        <Text style={styles.location}>
          {[property.area, property.city, property.state_name].filter(Boolean).join(', ')}
        </Text>
        <Text style={styles.price}>
          {formatCurrency(property.rent_amount)} / {property.payment_frequency === 'yearly' ? 'year' : 'month'}
        </Text>

        <View style={styles.metaRow}>
          <Text style={styles.meta}>{Number(property.bedrooms || 0)} bed</Text>
          <Text style={styles.meta}>{Number(property.bathrooms || 0)} bath</Text>
          <Text style={styles.meta}>{property.property_type || 'property'}</Text>
        </View>

        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>
          {property.description || 'No description available'}
        </Text>

        {canViewFull && property.landlord_name ? (
          <View style={styles.contactCard}>
            <Text style={styles.sectionTitle}>Landlord Contact</Text>
            <Text style={styles.contactText}>Name: {property.landlord_name}</Text>
            <Text style={styles.contactText}>Phone: {property.landlord_phone || 'N/A'}</Text>
            <Text style={styles.contactText}>Email: {property.landlord_email || 'N/A'}</Text>
          </View>
        ) : (
          <View style={styles.lockedCard}>
            <Icon name="lock-closed-outline" size={24} color="#1d4ed8" />
            <Text style={styles.lockedText}>
              Unlock full details and landlord contacts to continue.
            </Text>
            <Button
              title={unlocking ? 'Processing...' : 'Unlock Details'}
              onPress={handleUnlock}
              loading={unlocking}
            />
          </View>
        )}

        <View style={styles.actions}>
          <Button
            title="Save Property"
            onPress={handleSave}
            loading={saving}
            variant="outline"
            style={styles.actionBtn}
          />

          {isAuthenticated && user?.user_type === 'tenant' && (
            <Button
              title="Apply"
              onPress={handleApply}
              loading={applying}
              style={styles.actionBtn}
            />
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { fontSize: 16, color: '#64748b' },
  image: { width: '100%', height: 260 },
  back: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  location: { marginTop: 6, color: '#475569', fontSize: 14 },
  price: { marginTop: 10, fontSize: 26, fontWeight: '800', color: '#0284c7' },
  metaRow: { marginTop: 8, flexDirection: 'row', gap: 10 },
  meta: {
    backgroundColor: '#f1f5f9',
    color: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: { marginTop: 16, marginBottom: 8, fontSize: 17, fontWeight: '700', color: '#0f172a' },
  description: { color: '#334155', lineHeight: 22 },
  contactCard: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#bae6fd',
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 12,
  },
  contactText: { color: '#0f172a', marginBottom: 4 },
  lockedCard: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  lockedText: { color: '#1e3a8a', lineHeight: 20 },
  actions: { marginTop: 18, gap: 10 },
  actionBtn: { width: '100%' },
});

export default PropertyDetailScreen;
