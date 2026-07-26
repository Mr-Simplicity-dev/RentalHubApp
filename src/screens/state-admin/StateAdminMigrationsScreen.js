import React, { useContext, useEffect, useState } from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import Toast from 'react-native-toast-message';
import {
  InfoRow,
  PremiumButton,
  PremiumCard,
  PremiumHero,
  PremiumListScreen,
  StatusPill,
} from '../../components/common/PremiumLayout';
import { AuthContext } from '../../context/AuthContext';
import { stateAdminService } from '../../services/stateAdminService';
import { getErrorMessage, pickList } from '../../utils/http';
import { colors, radius, typography } from '../../theme';

import AppText from '../../components/common/AppText';
const tabs = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const getStatusColor = (status) => {
  if (status === 'approved') return colors.success;
  if (status === 'rejected') return colors.danger;
  return colors.warning;
};

const StateAdminMigrationsScreen = () => {
  const { user } = useContext(AuthContext);
  const [migrations, setMigrations] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState(null);

  const stateId = user?.assigned_state || user?.state_id || user?.stateId;

  const loadMigrations = async () => {
    if (!stateId) return;
    try {
      const response = await stateAdminService.getStatePropertyApprovals({
        status: activeTab,
      });
      setMigrations(pickList(response, ['data', 'approvals', 'properties']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load migrations'),
      });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMigrations();
  }, [stateId, activeTab]);

  const handleAction = async (propertyId, action) => {
    setActionId(`${propertyId}-${action}`);
    try {
      if (action === 'approve') {
        await stateAdminService.approveProperty(propertyId);
      } else {
        await stateAdminService.rejectProperty(propertyId, { reason: 'Rejected by admin' });
      }
      Toast.show({ type: 'success', text1: `Property ${action}d` });
      loadMigrations();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, `Could not ${action} property`),
      });
    } finally {
      setActionId(null);
    }
  };

  const header = (
    <>
      <PremiumHero
        eyebrow="State admin"
        title="Property migrations"
        subtitle="Approve, reject and monitor state-level property migration requests from mobile."
        icon="business-outline"
      />
      <View style={styles.tabRow}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            accessibilityRole="button"
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <AppText style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  return (
    <PremiumListScreen
      data={migrations}
      keyExtractor={(item) => String(item.id)}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        loadMigrations();
      }}
      header={header}
      emptyTitle={`No ${activeTab} migrations`}
      emptyMessage="Property migration requests for this state will appear here."
      emptyIcon="business-outline"
      renderItem={({ item }) => {
        const status = item.approval_status || activeTab;
        return (
          <PremiumCard>
            <View style={styles.cardHeader}>
              <View style={styles.titleBlock}>
                <AppText style={styles.cardTitle}>{item.title || item.property_name || 'Property'}</AppText>
                <AppText style={styles.cardOwner}>Owner: {item.owner_name || item.landlord_name || 'N/A'}</AppText>
              </View>
              <StatusPill label={status} color={getStatusColor(status)} />
            </View>

            <InfoRow
              icon="location-outline"
              label="Location"
              value={[item.city, item.state_name].filter(Boolean).join(', ') || 'Not available'}
            />

            {activeTab === 'pending' ? (
              <View style={styles.actions}>
                <PremiumButton
                  title="Approve"
                  onPress={() => handleAction(item.id, 'approve')}
                  loading={actionId === `${item.id}-approve`}
                  icon="checkmark-circle-outline"
                  style={styles.actionButton}
                />
                <PremiumButton
                  title="Reject"
                  variant="ghost"
                  onPress={() => handleAction(item.id, 'reject')}
                  loading={actionId === `${item.id}-reject`}
                  icon="close-circle-outline"
                  style={styles.actionButton}
                />
              </View>
            ) : null}
          </PremiumCard>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 10,
  },
  tabActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  tabText: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 13,
  },
  tabTextActive: {
    color: colors.white,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  titleBlock: {
    flex: 1,
  },
  cardTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 16,
  },
  cardOwner: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionButton: {
    flex: 1,
  },
});

export default StateAdminMigrationsScreen;
