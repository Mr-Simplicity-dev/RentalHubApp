import React, { useEffect, useState } from 'react';
import {Image, StyleSheet View} from 'react-native';
import Toast from 'react-native-toast-message';
import BrandImagePlaceholder from '../../components/common/BrandImagePlaceholder';
import {
  InfoRow,
  PremiumButton,
  PremiumCard,
  PremiumCenter,
  PremiumHero,
  PremiumScreen,
  PremiumSectionTitle,
  StatusPill,
  formatNaira,
} from '../../components/common/PremiumLayout';
import { adminService } from '../../services/adminService';
import { getErrorMessage, pickObject } from '../../utils/http';
import { colors, radius, typography } from '../../theme';

import AppText from '../../components/common/AppText';
const getStatusColor = (status) => {
  if (status === 'approved' || status === 'active') return colors.success;
  if (status === 'rejected' || status === 'inactive') return colors.danger;
  return colors.warning;
};

const AdminPropertyDetailScreen = ({ route }) => {
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
    return <PremiumCenter loading title="Loading property details" />;
  }

  if (!property) {
    return (
      <PremiumCenter
        icon="home-outline"
        title="Property not found"
        message="This property could not be loaded from the admin API."
      />
    );
  }

  const cover = property.primary_photo || property.photos?.[0]?.photo_url;
  const status = property.approval_status || property.status || 'pending';

  return (
    <PremiumScreen>
      <PremiumHero
        eyebrow="Admin property review"
        title={property.title || 'Property'}
        subtitle={[property.area, property.city, property.state_name].filter(Boolean).join(', ') || 'Location not available'}
        icon="business-outline"
        right={<StatusPill label={status} color={getStatusColor(status)} />}
      />

      <PremiumCard style={styles.mediaCard}>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.image} />
        ) : (
          <BrandImagePlaceholder style={styles.image} title="Property media pending" />
        )}
        <View style={styles.pricePanel}>
          <AppText style={styles.price}>{formatNaira(property.rent_amount)}</AppText>
          <AppText style={styles.frequency}>
            per {property.payment_frequency === 'yearly' ? 'year' : 'month'}
          </AppText>
        </View>
      </PremiumCard>

      <PremiumSectionTitle title="Owner information" />
      <PremiumCard>
        <InfoRow icon="person-outline" label="Name" value={property.landlord_name || property.owner_name || 'N/A'} />
        <InfoRow icon="mail-outline" label="Email" value={property.landlord_email || 'N/A'} />
        <InfoRow icon="call-outline" label="Phone" value={property.landlord_phone || 'N/A'} />
      </PremiumCard>

      <PremiumSectionTitle title="Property details" />
      <PremiumCard>
        <InfoRow
          icon="bed-outline"
          label="Rooms"
          value={`${Number(property.bedrooms || 0)} bed • ${Number(property.bathrooms || 0)} bath`}
        />
        <InfoRow icon="home-outline" label="Type" value={property.property_type || 'N/A'} />
        <InfoRow
          icon="calendar-outline"
          label="Listed"
          value={property.created_at ? new Date(property.created_at).toLocaleDateString() : 'N/A'}
        />
        <InfoRow icon="eye-outline" label="Views" value={property.view_count ?? property.views ?? 0} />
      </PremiumCard>

      <PremiumSectionTitle title="Description" />
      <PremiumCard>
        <AppText style={styles.description}>{property.description || 'No description provided.'}</AppText>
      </PremiumCard>

      {status === 'pending' ? (
        <PremiumCard>
          <AppText style={styles.actionTitle}>Approval decision</AppText>
          <View style={styles.actions}>
            <PremiumButton
              title="Approve"
              onPress={handleApprove}
              loading={actionLoading}
              icon="checkmark-circle-outline"
              style={styles.actionButton}
            />
            <PremiumButton
              title="Reject"
              variant="ghost"
              onPress={handleReject}
              loading={actionLoading}
              icon="close-circle-outline"
              style={styles.actionButton}
            />
          </View>
        </PremiumCard>
      ) : null}

      <AppText style={styles.meta}>Property ID: {property.id}</AppText>
    </PremiumScreen>
  );
};

const styles = StyleSheet.create({
  mediaCard: {
    overflow: 'hidden',
    padding: 0,
  },
  image: {
    backgroundColor: colors.surfaceBlue,
    height: 220,
    width: '100%',
  },
  pricePanel: {
    padding: 16,
  },
  price: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 32,
  },
  frequency: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  description: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 14,
    lineHeight: 22,
  },
  actionTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 18,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
  },
  meta: {
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 6,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
});

export default AdminPropertyDetailScreen;
