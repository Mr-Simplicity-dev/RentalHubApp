import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useEffect, useState } from 'react';
import {StyleSheet, View} from 'react-native';
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
import { colors, typography, typeScale } from '../../theme';

import AppText from '../../components/common/AppText';
import TourTarget from '../../components/tour/TourTarget';
const AdminEvidenceVerificationsScreen = () => {
  useInterfaceLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadEvidence = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/evidence-verifications');
      setItems(pickList(response, ['data']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Failed"),
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
      emptyTitle={ui("No verification records")}
      emptyMessage={ui("Completed evidence-verification payments will appear here.")}
      emptyIcon="folder-open-outline"
      header={
        <TourTarget id="admin_compliance" padding={6} radius={18}>
          <PremiumHero
            eyebrow={ui("Compliance")}
            title={ui("Evidence verifications")}
            subtitle={ui("Audit paid evidence checks and their linked disputes from the verified server record.")}
            icon="folder-open-outline"
            right={<StatusPill label={ui("{value0} records", {value0: (items.length)})} color={colors.blue} />}
          />
        </TourTarget>
      }
      renderItem={({ item }) => (
        <PremiumCard>
          <View style={styles.cardHeader}>
            <View style={styles.evidenceIcon}>
              <AppText style={styles.evidenceIconText}>{ui("EV")}</AppText>
            </View>
            <View style={styles.cardCopy}>
              <AppText style={styles.cardTitle}>{item.dispute_title || ui("Dispute #{value0}", {value0: (item.dispute_id || '-')})}</AppText>
              <AppText style={styles.cardMeta}>{item.created_at ? new Date(item.created_at).toLocaleString() : 'Date unavailable'}</AppText>
            </View>
            <StatusPill
              label={String(item.payment_status || 'unknown').replace(/_/g, ' ')}
              color={item.payment_status === 'completed' ? colors.success : colors.warning}
            />
          </View>
          <InfoRow icon="person-outline" label={ui("Payer")} value={item.payer_name || item.payer_email || 'N/A'} />
          <InfoRow icon="mail-outline" label={ui("Email")} value={item.payer_email || 'N/A'} />
          <InfoRow
            icon="wallet-outline"
            label={ui("Amount")}
            value={`${item.currency || 'NGN'} ${Number(item.amount || 0).toLocaleString()}`}
          />
          <InfoRow icon="receipt-outline" label={ui("Reference")} value={item.transaction_reference || 'N/A'} />
          <InfoRow icon="flag-outline" label={ui("Dispute status")} value={item.dispute_status || 'N/A'} />
          <InfoRow icon="person-add-outline" label={ui("Opened by")} value={item.opened_by_name || 'N/A'} />
          <InfoRow icon="person-remove-outline" label={ui("Against")} value={item.against_name || 'N/A'} />
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
    fontSize: typeScale.base,
    lineHeight: 24,
  },
  cardMeta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 3,
  },
});

export default AdminEvidenceVerificationsScreen;
