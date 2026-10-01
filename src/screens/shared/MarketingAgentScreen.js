import React, { useCallback, useState } from 'react';
import { Share, StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';
import {
  InfoRow,
  PremiumCard,
  PremiumCenter,
  PremiumHero,
  PremiumListScreen,
} from '../../components/common/PremiumLayout';
import { surveyService } from '../../services/surveyService';
import { paymentService } from '../../services/paymentService';
import WalletWithdrawModal from '../../components/dashboard/WalletWithdrawModal';
import { getErrorMessage, pickList } from '../../utils/http';
import { colors, radius, typography } from '../../theme';
import AppText from '../../components/common/AppText';

const formatDate = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(value);
  }
};

const MarketingAgentScreen = ({ navigation }) => {
  const [responses, setResponses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await surveyService.marketingAgentOverview();
      const payload = response?.data;
      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.responses)
          ? payload.responses
          : Array.isArray(payload?.rows)
            ? payload.rows
            : [];
      setResponses(rows);
      setSummary(payload && !Array.isArray(payload) ? payload : null);

      // The invite link is a separate, non-critical call: a failure must not blank
      // the respondents list.
      try {
        const inviteResponse = await surveyService.marketingAgentInvite();
        setInvite(inviteResponse?.data || null);
      } catch {
        setInvite(null);
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(err, 'Could not load your captured respondents'),
      });
      setResponses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    bank_name: '',
    account_number: '',
    account_name: '',
  });

  const submitWithdrawal = async () => {
    if (withdrawSubmitting) return;
    setWithdrawSubmitting(true);
    try {
      await paymentService.requestWalletWithdrawal({
        amount: Number(withdrawForm.amount),
        bank_name: withdrawForm.bank_name,
        account_number: withdrawForm.account_number,
        account_name: withdrawForm.account_name,
      });
      Toast.show({ type: 'success', text1: 'Withdrawal requested' });
      setWithdrawOpen(false);
      setWithdrawForm({ amount: '', bank_name: '', account_number: '', account_name: '' });
      load();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Withdrawal failed',
        text2: getErrorMessage(error, 'Could not request this withdrawal'),
      });
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  const shareInvite = async () => {    if (!invite?.invite_url) return;
    try {
      await Share.share({
        message: `Open your RentalHub account here: ${invite.invite_url}`,
        url: invite.invite_url,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Could not share',
        text2: getErrorMessage(error, 'Try copying the link instead.'),
      });
    }
  };

  if (loading) {
    return <PremiumCenter loading title="Loading respondents" />;
  }

  const metric = (label, value) => (
    <View style={styles.metric}>
      <AppText style={styles.metricValue}>{value}</AppText>
      <AppText style={styles.metricLabel}>{label}</AppText>
    </View>
  );

  return (
    <>
    <PremiumListScreen
      data={responses}
      keyExtractor={(item, index) => String(item.id || item.respondent_code || `r-${index}`)}
      refreshing={false}
      onRefresh={load}
      header={
        <>
          <PremiumHero
            eyebrow="Marketing"
            title="Survey respondents"
            subtitle="People you have captured for the market-research survey."
            icon="people-outline"
          />

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Conduct a survey for someone"
            activeOpacity={0.88}
            onPress={() => navigation.navigate('PublicSurvey')}
            style={styles.conductButton}
          >
            <Icon name="add-circle-outline" size={18} color={colors.white} />
            <AppText style={styles.conductButtonText}>Conduct Survey</AppText>
          </TouchableOpacity>
          <View style={styles.metricRow}>
            {metric('Captured', summary?.stats?.captured ?? responses.length)}
            {metric('In progress', summary?.stats?.in_progress ?? 0)}
          </View>
          <View style={styles.metricRow}>
            {metric('With email', summary?.stats?.with_email ?? 0)}
            {metric('With phone', summary?.stats?.with_phone ?? 0)}
          </View>

          {summary?.commissions ? (
            <>
              <View style={styles.metricRow}>
                {metric(
                  'Earned',
                  `₦${Number(summary.commissions.total_earned || 0).toLocaleString()}`
                )}
                {metric('Accounts', summary.commissions.qualified_count || 0)}
              </View>
              <View style={styles.metricRow}>
                {metric(
                  'Wallet',
                  `₦${Number(summary.commissions.wallet_balance || 0).toLocaleString()}`
                )}
                {metric('Reversed', summary.commissions.reversed_count || 0)}
              </View>
            </>
          ) : null}

          {invite?.invite_url ? (
            <PremiumCard>
              <AppText style={styles.cardTitle}>Open an account for someone</AppText>
              <AppText style={styles.code}>
                Share this link — they register themselves, set their own password and
                choose their lawyer. You earn when they verify and when they pay.
              </AppText>
              <AppText style={styles.inviteCode}>{invite.referral_code}</AppText>
              <TouchableOpacity onPress={shareInvite} style={styles.shareButton}>
                <Icon name="share-social-outline" size={16} color={colors.white} />
                <AppText style={styles.shareButtonText}>Share signup link</AppText>
              </TouchableOpacity>
              {Number(summary?.commissions?.wallet_balance || 0) > 0 ? (
                <TouchableOpacity
                  onPress={() => setWithdrawOpen(true)}
                  style={styles.withdrawButton}
                >
                  <Icon name="cash-outline" size={16} color={colors.blue} />
                  <AppText style={styles.withdrawButtonText}>Withdraw commission</AppText>
                </TouchableOpacity>
              ) : null}
            </PremiumCard>
          ) : null}

          {Array.isArray(summary?.commissions?.commissions) &&
          summary.commissions.commissions.length > 0 ? (
            <PremiumCard>
              <AppText style={styles.cardTitle}>Commission history</AppText>
              {summary.commissions.commissions.slice(0, 15).map((row) => (
                <View key={String(row.id)} style={styles.breakdownRow}>
                  <View style={styles.agentCopy}>
                    <AppText style={styles.breakdownLabel} numberOfLines={1}>
                      {row.new_user_name || row.new_user_email || 'Account'}
                    </AppText>
                    <AppText style={styles.code}>
                      {row.account_type} ·{' '}
                      {row.stage === 'verified' ? 'verified' : 'registration paid'} ·{' '}
                      {row.status}
                    </AppText>
                  </View>
                  <AppText style={styles.breakdownValue}>
                    ₦{Number(row.amount || 0).toLocaleString()}
                  </AppText>
                </View>
              ))}
            </PremiumCard>
          ) : null}

          {Array.isArray(summary?.by_lga) && summary.by_lga.length > 0 ? (
            <PremiumCard>
              <AppText style={styles.cardTitle}>Captured by LGA</AppText>
              {summary.by_lga.slice(0, 15).map((row) => (
                <View key={String(row.lga)} style={styles.breakdownRow}>
                  <AppText style={styles.breakdownLabel} numberOfLines={1}>
                    {row.lga}
                  </AppText>
                  <AppText style={styles.breakdownValue}>{Number(row.count) || 0}</AppText>
                </View>
              ))}
            </PremiumCard>
          ) : null}
        </>
      }
      emptyTitle="No respondents yet"
      emptyMessage="Respondents you capture for the survey will appear here."
      emptyIcon="people-outline"
      renderItem={({ item }) => (
        <PremiumCard>
          <View style={styles.cardTop}>
            <View style={styles.cardCopy}>
              <AppText style={styles.cardTitle}>
                {item.respondent_name || item.name || `Respondent #${item.id || ''}`}
              </AppText>
              {item.respondent_code ? (
                <AppText style={styles.code}>{item.respondent_code}</AppText>
              ) : null}
            </View>
            {item.status ? <StatusPillShort status={item.status} /> : null}
          </View>
          {item.respondent_phone ? (
            <InfoRow icon="call-outline" label="Phone" value={item.respondent_phone} />
          ) : null}
          {item.state_name || item.lga_name ? (
            <InfoRow
              icon="location-outline"
              label="Location"
              value={[item.state_name, item.lga_name].filter(Boolean).join(', ')}
            />
          ) : null}
          {item.created_at ? (
            <InfoRow icon="time-outline" label="Captured" value={formatDate(item.created_at)} />
          ) : null}
        </PremiumCard>
      )}
    />
    <WalletWithdrawModal
      visible={withdrawOpen}
      onClose={() => setWithdrawOpen(false)}
      onSubmit={submitWithdrawal}
      loading={withdrawSubmitting}
      walletBalance={Number(summary?.commissions?.wallet_balance || 0)}
      withdrawForm={withdrawForm}
      setWithdrawForm={setWithdrawForm}
      withdrawHistory={[]}
    />
    </>
  );
};

const StatusPillShort = ({ status }) => {
  const label = String(status || 'pending').replace(/_/g, ' ');
  return (
    <View style={styles.pill}>
      <AppText style={styles.pillText}>{label}</AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  metricRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  metric: {
    flex: 1,
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  metricValue: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 22,
  },
  metricLabel: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 11,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  cardTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardCopy: {
    flex: 1,
  },
  cardTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 16,
    marginBottom: 6,
  },
  breakdownRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  breakdownLabel: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.regular,
    fontSize: 13,
    marginRight: 10,
  },
  breakdownValue: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 14,
  },
  inviteCode: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 22,
    letterSpacing: 2,
    marginTop: 10,
  },
  shareButton: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 12,
  },
  shareButtonText: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  withdrawButton: {
    alignItems: 'center',
    borderColor: colors.blue,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 12,
  },
  withdrawButtonText: {
    color: colors.blue,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  conductButton: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 12,
    paddingVertical: 13,
  },
  conductButtonText: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: 15,
  },
  code: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    marginTop: 2,
  },
  pill: {
    backgroundColor: `${colors.surfaceBlue}`,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: {
    color: colors.blue,
    fontFamily: typography.semibold,
    fontSize: 11,
    textTransform: 'capitalize',
  },
});

export default MarketingAgentScreen;
