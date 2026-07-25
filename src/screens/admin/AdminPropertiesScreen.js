import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { adminService } from '../../services/adminService';
import { getErrorMessage, pickList } from '../../utils/http';
import {
  InfoRow,
  PremiumCard,
  PremiumHero,
  PremiumListScreen,
  StatusPill,
} from '../../components/common/PremiumLayout';
import { colors, typography } from '../../theme';

import AppText from '../../components/common/AppText';
const AdminPropertiesScreen = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadProperties = async () => {
    setLoading(true);
    try {
      const response = await adminService.getProperties();
      setItems(pickList(response, ['data', 'properties']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load properties'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  return (
    <PremiumListScreen
      data={items}
      refreshing={loading}
      onRefresh={loadProperties}
      keyExtractor={(item) => String(item.id)}
      emptyTitle="No properties found"
      emptyMessage="Properties submitted to RentalHub will appear here."
      emptyIcon="home-outline"
      header={
        <PremiumHero
          eyebrow="Administration"
          title="Properties"
          subtitle="Review property records, landlords and locations in a cleaner mobile view."
          icon="business-outline"
          right={<StatusPill label={`${items.length} records`} color={colors.blue} />}
        />
      }
      renderItem={({ item }) => {
        const location =
          [item.city, item.state].filter(Boolean).join(', ') ||
          [item.city, item.state_name].filter(Boolean).join(', ') ||
          'Location unavailable';

        return (
          <PremiumCard>
            <View style={styles.cardHeader}>
              <View style={styles.propertyIcon}>
                <AppText style={styles.propertyIconText}>RH</AppText>
              </View>
              <View style={styles.cardCopy}>
                <AppText style={styles.cardTitle}>{item.title || 'Untitled property'}</AppText>
                <AppText style={styles.cardMeta}>{location}</AppText>
              </View>
            </View>
            <InfoRow icon="person-outline" label="Landlord" value={item.landlord_name || 'No landlord name'} />
            <InfoRow icon="pricetag-outline" label="Status" value={item.status || item.approval_status || '—'} />
          </PremiumCard>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 6,
  },
  propertyIcon: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderRadius: 18,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  propertyIconText: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 13,
  },
  cardCopy: {
    flex: 1,
  },
  cardTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 16,
  },
  cardMeta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 3,
  },
});

export default AdminPropertiesScreen;
