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

const AdminEvidenceVerificationsScreen = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadEvidence = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/evidence-verifications');
      setItems(pickList(response?.data || response, ['data']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load evidence verification records'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvidence();
  }, []);

  return (
    <PremiumListScreen
      data={items}
      refreshing={loading}
      onRefresh={loadEvidence}
      keyExtractor={(item) => String(item.id)}
      emptyTitle="No verification records"
      emptyMessage="Completed evidence-verification payments will appear here."
      emptyIcon="folder-open-outline"
      header={
        <PremiumHero
          eyebrow="Compliance"
          title="Evidence verifications"
          subtitle="Audit paid evidence checks and their linked disputes from the verified server record."
          icon="folder-open-outline"
          right={<StatusPill label={`${items.length} records`} color={colors.blue} />}
        />
      }
      renderItem={({ item }) => (
        <PremiumCard>
          <View style={styles.cardHeader}>
            <View style={styles.evidenceIcon}>
              <Text style={styles.evidenceIconText}>EV</Text>
            </View>
            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle}>{item.dispute_title || `Dispute #${item.dispute_id || '-'}`}</Text>
              <Text style={styles.cardMeta}>{item.created_at ? new Date(item.created_at).toLocaleString() : 'Date unavailable'}</Text>
            </View>
            <StatusPill
              label={String(item.payment_status || 'unknown').replace(/_/g, ' ')}
              color={item.payment_status === 'completed' ? colors.success : colors.warning}
            />
          </View>
          <InfoRow icon="person-outline" label="Payer" value={item.payer_name || item.payer_email || 'N/A'} />
          <InfoRow icon="mail-outline" label="Email" value={item.payer_email || 'N/A'} />
          <InfoRow
            icon="wallet-outline"
            label="Amount"
            value={`${item.currency || 'NGN'} ${Number(item.amount || 0).toLocaleString()}`}
          />
          <InfoRow icon="receipt-outline" label="Reference" value={item.transaction_reference || 'N/A'} />
          <InfoRow icon="flag-outline" label="Dispute status" value={item.dispute_status || 'N/A'} />
          <InfoRow icon="person-add-outline" label="Opened by" value={item.opened_by_name || 'N/A'} />
          <InfoRow icon="person-remove-outline" label="Against" value={item.against_name || 'N/A'} />
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
  evidenceIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 18,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  evidenceIconText: {
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
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 3,
  },
});

export default AdminEvidenceVerificationsScreen;
