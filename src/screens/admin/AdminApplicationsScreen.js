import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import OperationNoteModal from '../../components/admin/OperationNoteModal';
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
  const [pendingAction, setPendingAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

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

  const submitDecision = async (reason) => {
    if (!pendingAction?.item?.id) return;

    const { item, type } = pendingAction;
    setActionLoading(true);
    try {
      if (type === 'approve') {
        await adminService.approveApplication(item.id, reason);
      } else {
        await adminService.rejectApplication(item.id, reason);
      }
      setPendingAction(null);
      await loadApplications();
      Toast.show({
        type: 'success',
        text1: type === 'approve' ? 'Application approved' : 'Application rejected',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(
          error,
          type === 'approve' ? 'Could not approve application' : 'Could not reject application'
        ),
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
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
            subtitle="Review tenant applications with clear status and recorded decision notes."
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
            {String(item.status || 'pending').toLowerCase() === 'pending' ? (
              <View style={styles.actions}>
                <PremiumButton
                  title="Approve"
                  icon="checkmark-circle-outline"
                  onPress={() => setPendingAction({ item, type: 'approve' })}
                />
                <PremiumButton
                  title="Reject"
                  variant="ghost"
                  icon="close-circle-outline"
                  onPress={() => setPendingAction({ item, type: 'reject' })}
                />
              </View>
            ) : null}
          </PremiumCard>
        )}
      />
      <OperationNoteModal
        visible={Boolean(pendingAction)}
        title={pendingAction?.type === 'approve' ? 'Approve application' : 'Reject application'}
        message={`${pendingAction?.item?.tenant_name || 'This tenant'} applied for ${pendingAction?.item?.property_title || 'this property'}.`}
        label={pendingAction?.type === 'approve' ? 'Approval note' : 'Rejection reason'}
        placeholder={
          pendingAction?.type === 'approve'
            ? 'Record why this application is approved'
            : 'Explain why this application is rejected'
        }
        confirmText={pendingAction?.type === 'approve' ? 'Approve application' : 'Reject application'}
        icon={pendingAction?.type === 'approve' ? 'checkmark-circle-outline' : 'close-circle-outline'}
        variant={pendingAction?.type === 'approve' ? 'primary' : 'danger'}
        loading={actionLoading}
        onCancel={() => setPendingAction(null)}
        onConfirm={submitDecision}
      />
    </>
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
    fontFamily: typography.semibold,
    fontSize: 13,
    marginTop: 3,
    textTransform: 'capitalize',
  },
  actions: {
    gap: 10,
    marginTop: 12,
  },
});

export default AdminApplicationsScreen;
