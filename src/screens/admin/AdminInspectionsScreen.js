import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import api from '../../services/api';
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
const STATUS_COLORS = {
  pending: colors.blue,
  completed: colors.success,
  scheduled: '#B7791F',
};

const AdminInspectionsScreen = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadInspections = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/inspections');
      setItems(pickList(response?.data || response, ['data']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load inspections'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInspections();
  }, []);

  return (
    <PremiumListScreen
      data={items}
      refreshing={loading}
      onRefresh={loadInspections}
      keyExtractor={(item) => String(item.id)}
      emptyTitle="No inspections found"
      emptyMessage="Scheduled or completed inspections will appear here."
      emptyIcon="search-outline"
      header={
        <PremiumHero
          eyebrow="Operations"
          title="Inspections"
          subtitle="Track inspection status, assigned inspectors and dates in a cleaner mobile layout."
          icon="search-outline"
          right={<StatusPill label={`${items.length} records`} color={colors.blue} />}
        />
      }
      renderItem={({ item }) => {
        const status = item.status || 'pending';
        const badgeColor = STATUS_COLORS[status] || colors.blue;

        return (
          <PremiumCard>
            <View style={styles.cardHeader}>
              <View style={styles.inspectionIcon}>
                <AppText style={styles.inspectionIconText}>IN</AppText>
              </View>
              <View style={styles.cardCopy}>
                <AppText style={styles.cardTitle}>{item.property_name || item.property_title || 'Property'}</AppText>
                <StatusPill label={status} color={badgeColor} />
              </View>
            </View>
            <InfoRow icon="person-outline" label="Tenant" value={item.tenant_name || 'N/A'} />
            <InfoRow icon="shield-outline" label="Assigned admin" value={item.assigned_admin_name || 'Unassigned'} />
            <InfoRow
              icon="calendar-outline"
              label="Requested"
              value={item.requested_at ? new Date(item.requested_at).toLocaleString() : 'N/A'}
            />
            <InfoRow icon="location-outline" label="Location" value={[item.lga_name, item.state_name].filter(Boolean).join(', ') || 'N/A'} />
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
  inspectionIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 18,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  inspectionIconText: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 13,
  },
  cardCopy: {
    flex: 1,
    gap: 7,
  },
  cardTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 16,
  },
});

export default AdminInspectionsScreen;
