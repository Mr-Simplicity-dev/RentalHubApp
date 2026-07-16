import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { adminService } from '../../services/adminService';
import { getErrorMessage, pickList } from '../../utils/http';
import {
  InfoRow,
  PremiumButton,
  PremiumCard,
  PremiumHero,
  PremiumListScreen,
  StatusPill,
} from '../../components/common/PremiumLayout';
import { colors, typography } from '../../theme';

const AdminApplicationsScreen = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const response = await adminService.getApplications();
      setItems(pickList(response, ['data', 'applications']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load applications'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const approve = async (id) => {
    try {
      await adminService.approveApplication(id);
      await loadApplications();
      Toast.show({ type: 'success', text1: 'Application approved' });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not approve application'),
      });
    }
  };

  const reject = async (id) => {
    try {
      await adminService.rejectApplication(id);
      await loadApplications();
      Toast.show({ type: 'success', text1: 'Application rejected' });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not reject application'),
      });
    }
  };

  return (
    <PremiumListScreen
      data={items}
      refreshing={loading}
      onRefresh={loadApplications}
      keyExtractor={(item) => String(item.id)}
      emptyTitle="No applications found"
      emptyMessage="Rental applications that need review will appear here."
      emptyIcon="document-text-outline"
      header={
        <PremiumHero
          eyebrow="Administration"
          title="Applications"
          subtitle="Review tenant applications with clear status and quick actions."
          icon="document-text-outline"
          right={<StatusPill label={`${items.length} records`} color={colors.blue} />}
        />
      }
      renderItem={({ item }) => (
        <PremiumCard>
          <View style={styles.cardHeader}>
            <View style={styles.applicationIcon}>
              <Text style={styles.applicationIconText}>APP</Text>
            </View>
            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle}>{item.property_title || 'Property application'}</Text>
              <Text style={styles.cardMeta}>{item.status || 'pending'}</Text>
            </View>
          </View>
          <InfoRow icon="person-outline" label="Tenant" value={item.tenant_name || '—'} />
          <InfoRow icon="home-outline" label="Property" value={item.property_title || '—'} />
          <View style={styles.actions}>
            <PremiumButton title="Approve" icon="checkmark-circle-outline" onPress={() => approve(item.id)} />
            <PremiumButton title="Reject" variant="ghost" icon="close-circle-outline" onPress={() => reject(item.id)} />
          </View>
        </PremiumCard>
      )}
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
  applicationIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 18,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  applicationIconText: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 11,
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
    fontFamily: typography.semibold,
    fontSize: 12,
    marginTop: 3,
    textTransform: 'capitalize',
  },
  actions: {
    gap: 10,
    marginTop: 12,
  },
});

export default AdminApplicationsScreen;
