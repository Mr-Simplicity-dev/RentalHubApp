import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { adminService } from '../../services/adminService';
import Button from '../../components/common/Button';
import { getErrorMessage, pickObject } from '../../utils/http';

const formatCurrency = (value) => `NGN ${Number(value || 0).toLocaleString()}`;

const AdminPropertyDetailScreen = ({ route, navigation }) => {
  const propertyId = route?.params?.id;
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (propertyId) loadProperty();
  }, [propertyId]);

  const loadProperty = async () => {
    setLoading(true);
    try {
      const response = await adminService.getPropertyById(propertyId);
      setProperty(pickObject(response, ['data', 'property']));
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

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await adminService.approveProperty(propertyId);
      Toast.show({ type: 'success', text1: 'Property approved' });
      loadProperty();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not approve property'),
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      await adminService.rejectProperty(propertyId);
      Toast.show({ type: 'success', text1: 'Property rejected' });
      loadProperty();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not reject property'),
      });
    } finally {
      setActionLoading(false);
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

  const cover = property.primary_photo || property.photos?.[0]?.photo_url || 'https://via.placeholder.com/640x400?text=Property';

  return (
    <ScrollView style={styles.screen}>
      <Image source={{ uri: cover }} style={styles.image} />
      <View style={styles.content}>
        <Text style={styles.title}>{property.title}</Text>
        <Text style={styles.location}>
          {[property.area, property.city, property.state_name].filter(Boolean).join(', ')}
        </Text>
        <Text style={styles.price}>
          {formatCurrency(property.rent_amount)} / {property.payment_frequency === 'yearly' ? 'year' : 'month'}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Owner Info</Text>
          <Text style={styles.infoText}>Name: {property.landlord_name || property.owner_name || 'N/A'}</Text>
          <Text style={styles.infoText}>Email: {property.landlord_email || 'N/A'}</Text>
          <Text style={styles.infoText}>Phone: {property.landlord_phone || 'N/A'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Details</Text>
          <Text style={styles.infoText}>
            {Number(property.bedrooms || 0)} bed | {Number(property.bathrooms || 0)} bath
          </Text>
          <Text style={styles.infoText}>Type: {property.property_type || 'N/A'}</Text>
          <Text style={styles.infoText}>Status: {property.status || property.approval_status || 'pending'}</Text>
          <Text style={styles.infoText}>
            Listed: {property.created_at ? new Date(property.created_at).toLocaleDateString() : 'N/A'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{property.description || 'No description'}</Text>
        </View>

        {property.approval_status === 'pending' && (
          <View style={styles.actions}>
            <Button title="Approve" onPress={handleApprove} loading={actionLoading} style={styles.actionBtn} />
            <Button title="Reject" variant="danger" onPress={handleReject} loading={actionLoading} style={styles.actionBtn} />
          </View>
        )}

        <View style={styles.metaSection}>
          <Text style={styles.metaLabel}>ID: {property.id}</Text>
          <Text style={styles.metaLabel}>
            Views: {property.view_count ?? property.views ?? 0}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { fontSize: 16, color: '#64748b' },
  image: { width: '100%', height: 240 },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  location: { marginTop: 6, color: '#475569', fontSize: 14 },
  price: { marginTop: 10, fontSize: 26, fontWeight: '800', color: '#0284c7' },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  infoText: { color: '#334155', fontSize: 14, lineHeight: 22 },
  description: { color: '#334155', lineHeight: 22 },
  actions: { marginTop: 20, gap: 10 },
  actionBtn: { width: '100%' },
  metaSection: { marginTop: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  metaLabel: { color: '#64748b', fontSize: 12 },
});

export default AdminPropertyDetailScreen;
