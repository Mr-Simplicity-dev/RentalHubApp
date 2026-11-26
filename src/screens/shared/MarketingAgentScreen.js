import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useCallback, useContext, useLayoutEffect, useState } from 'react';
import { Alert, Modal, Platform, Pressable, Share, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import NotificationBell from '../../components/common/NotificationBell';
import HeadphoneSupportButton from '../../components/calls/HeadphoneSupportButton';
import { AuthContext } from '../../context/AuthContext';
import { surveyService } from '../../services/surveyService';
import { paymentService } from '../../services/paymentService';
import WalletWithdrawModal from '../../components/dashboard/WalletWithdrawModal';
import { getErrorMessage } from '../../utils/http';
import { colors, radius, typography, typeScale } from '../../theme';
import AppText from '../../components/common/AppText';
import TourTarget from '../../components/tour/TourTarget';

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
  const interfaceLanguage = useInterfaceLanguage();
  const insets = useSafeAreaInsets();
  const { user, logout } = useContext(AuthContext);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [responses, setResponses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const confirmLogout = useCallback(() => {
    Alert.alert(
      ui('Log out'),
      ui('Are you sure you want to log out of your Marketing Agent account?'),
      [
        { text: ui('Cancel'), style: 'cancel' },
        {
          text: ui('Log out'),
          style: 'destructive',
          onPress: () => {
            logout?.();
          },
        },
      ]
    );
  }, [logout]);

  const userInitial = String(user?.full_name || 'M').trim().charAt(0).toUpperCase() || 'M';

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: Platform.OS === 'ios' ? ui('Marketing') : ui('Marketing Dashboard'),
      headerRight: () => (
        <View style={styles.headerActions}>
          <HeadphoneSupportButton compact={Platform.OS === 'ios'} />
          <NotificationBell />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={ui('Account menu')}
            accessibilityState={{ expanded: headerMenuOpen }}
            activeOpacity={0.85}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            onPress={() => setHeaderMenuOpen((open) => !open)}
            style={styles.headerDropdownTrigger}
          >
            <View style={styles.headerAvatarCircle}>
              <AppText style={styles.headerAvatarText}>{userInitial}</AppText>
            </View>
            <Icon
              name={headerMenuOpen ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={colors.navy}
            />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, headerMenuOpen, userInitial, interfaceLanguage]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
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

      try {
        const inviteResponse = await surveyService.marketingAgentInvite();
        setInvite(inviteResponse?.data || null);
      } catch {
        setInvite(null);
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: ui('Failed'),
        text2: getErrorMessage(err, 'Could not load your marketing dashboard'),
      });
      setResponses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(false);
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
      Toast.show({ type: 'success', text1: ui('Withdrawal requested') });
      setWithdrawOpen(false);
      setWithdrawForm({ amount: '', bank_name: '', account_number: '', account_name: '' });
      load(true);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui('Withdrawal failed'),
        text2: getErrorMessage(error, 'Could not request this withdrawal'),
      });
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  const shareInvite = async () => {
    if (!invite?.invite_url) return;
    try {
      await Share.share({
        title: ui('Join RentalHub Nigeria'),
        message: ui('Open your RentalHub account here: {value0}', {
          value0: invite.invite_url,
        }),
        url: invite.invite_url,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui('Could not share'),
        text2: getErrorMessage(error, 'Try copying the link instead.'),
      });
    }
  };

  if (loading) {
    return <PremiumCenter loading title={ui('Loading marketing dashboard')} />;
  }

  const metric = (label, value) => (
    <View style={styles.metric}>
      <AppText style={styles.metricValue}>{value}</AppText>
      <AppText style={styles.metricLabel}>{label}</AppText>
    </View>
  );

  const territory = [user?.assigned_lga, user?.assigned_state].filter(Boolean).join(', ');

  return (
    <>
      <PremiumListScreen
        data={responses}
        keyExtractor={(item, index) => String(item.id || item.respondent_code || `r-${index}`)}
        refreshing={refreshing}
        onRefresh={() => load(true)}
        header={
          <>
            <PremiumHero
              eyebrow={ui('MARKETING AGENT')}
              title={user?.full_name ? ui('Welcome, {value0}', { value0: user.full_name.split(' ')[0] }) : ui('Marketing Workspace')}
              subtitle={
                territory
                  ? `${territory} · ${ui('Conduct surveys, share your invite link, and track commissions.')}`
                  : ui('Conduct surveys, share your invite link, and track commissions.')
              }
              icon="megaphone-outline"
            />

            <TourTarget id="marketing_capture" label={ui('Conduct a survey')}>
              <TouchableOpacity
                style={styles.conductButton}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('PublicSurvey', { agent: true })}
              >
                <Icon name="add-circle-outline" size={18} color={colors.white} />
                <AppText style={styles.conductButtonText}>{ui('Conduct a survey')}</AppText>
              </TouchableOpacity>
            </TourTarget>

            <View style={styles.metricRow}>
              {metric(ui('Captured'), Number(summary?.stats?.captured ?? responses.length) || 0)}
              {metric(ui('In progress'), Number(summary?.stats?.in_progress) || 0)}
              {metric(ui('With phone'), Number(summary?.stats?.with_phone) || 0)}
            </View>

            {invite?.invite_url ? (
              <PremiumCard>
                <AppText style={styles.cardTitle}>{ui('Your invite link')}</AppText>
                <AppText style={styles.code}>
                  {ui('Send this link to the person you are registering. They choose their own password and lawyer, and the commission credits to you.')}
                </AppText>
                {invite.referral_code ? (
                  <AppText style={styles.inviteCode} selectable>
                    {invite.referral_code}
                  </AppText>
                ) : null}
                <AppText style={styles.inviteUrl} selectable numberOfLines={2}>
                  {invite.invite_url}
                </AppText>
                <TouchableOpacity
                  style={styles.shareButton}
                  activeOpacity={0.85}
                  onPress={shareInvite}
                >
                  <Icon name="share-social-outline" size={18} color={colors.white} />
                  <AppText style={styles.shareButtonText}>{ui('Share invite link')}</AppText>
                </TouchableOpacity>
              </PremiumCard>
            ) : null}

            {summary?.commissions ? (
              <PremiumCard>
                <AppText style={styles.cardTitle}>{ui('Commission wallet')}</AppText>
                <View style={styles.metricRow}>
                  {metric(
                    ui('Balance'),
                    `₦${Number(summary.commissions.wallet_balance || 0).toLocaleString()}`
                  )}
                  {metric(
                    ui('Earned'),
                    `₦${Number(summary.commissions.total_earned || 0).toLocaleString()}`
                  )}
                  {metric(ui('Qualified'), Number(summary.commissions.qualified_count || 0))}
                </View>
                <TouchableOpacity
                  style={styles.withdrawButton}
                  activeOpacity={0.85}
                  onPress={() => setWithdrawOpen(true)}
                >
                  <Icon name="cash-outline" size={18} color={colors.blue} />
                  <AppText style={styles.withdrawButtonText}>{ui('Withdraw commission')}</AppText>
                </TouchableOpacity>
                {(summary.commissions.commissions || []).slice(0, 10).map((row) => (
                  <View key={String(row.id)} style={styles.breakdownRow}>
                    <View style={styles.cardCopy}>
                      <AppText style={styles.breakdownLabel} numberOfLines={1}>
                        {row.new_user_name || row.new_user_email || ui('Account')}
                      </AppText>
                      <AppText style={styles.code}>
                        {row.account_type} ·{' '}
                        {row.stage === 'verified' ? ui('verified') : ui('registration paid')} ·{' '}
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
                <AppText style={styles.cardTitle}>{ui('Captured by LGA')}</AppText>
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
        emptyTitle={ui('No respondents yet')}
        emptyMessage={ui('Respondents you capture for the survey will appear here.')}
        emptyIcon="people-outline"
        renderItem={({ item }) => (
          <PremiumCard>
            <View style={styles.cardTop}>
              <View style={styles.cardCopy}>
                <AppText style={styles.cardTitle}>
                  {item.respondent_name ||
                    item.name ||
                    ui('Respondent #{value0}', { value0: item.id || '' })}
                </AppText>
                {item.respondent_code ? (
                  <AppText style={styles.code}>{item.respondent_code}</AppText>
                ) : null}
              </View>
              {item.status || item.completed_at ? (
                <StatusPillShort status={item.status || (item.completed_at ? 'completed' : 'draft')} />
              ) : null}
            </View>
            {item.respondent_phone ? (
              <InfoRow icon="call-outline" label={ui('Phone')} value={item.respondent_phone} />
            ) : null}
            {item.state_name || item.lga_name || item.agent_lga ? (
              <InfoRow
                icon="location-outline"
                label={ui('Location')}
                value={[item.state_name, item.lga_name || item.agent_lga].filter(Boolean).join(', ')}
              />
            ) : null}
            {item.created_at ? (
              <InfoRow icon="time-outline" label={ui('Captured')} value={formatDate(item.created_at)} />
            ) : null}
          </PremiumCard>
        )}
      />

      <Modal
        visible={headerMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setHeaderMenuOpen(false)}
      >
        <Pressable
          style={styles.dropdownBackdrop}
          onPress={() => setHeaderMenuOpen(false)}
        >
          <Pressable
            onPress={() => {}}
            style={[
              styles.dropdownCard,
              { top: Math.max(insets.top, 12) + (Platform.OS === 'ios' ? 46 : 52) },
            ]}
          >
            <View style={styles.dropdownHeader}>
              <AppText style={styles.dropdownUserName} numberOfLines={1}>
                {user?.full_name || ui('Marketing Agent')}
              </AppText>
              {user?.email ? (
                <AppText style={styles.dropdownUserEmail} numberOfLines={1}>
                  {user.email}
                </AppText>
              ) : null}
              <View style={styles.dropdownRolePill}>
                <AppText style={styles.dropdownRoleText}>{ui('Marketing Agent')}</AppText>
              </View>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.75}
              style={styles.dropdownItem}
              onPress={() => {
                setHeaderMenuOpen(false);
                navigation.navigate('PropertyList');
              }}
            >
              <Icon name="home-outline" size={18} color={colors.blue} />
              <AppText style={styles.dropdownItemText}>{ui('Property Market')}</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.75}
              style={styles.dropdownItem}
              onPress={() => {
                setHeaderMenuOpen(false);
                navigation.navigate('Messages');
              }}
            >
              <Icon name="chatbubbles-outline" size={18} color={colors.navy} />
              <AppText style={styles.dropdownItemText}>{ui('Messages')}</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.75}
              style={styles.dropdownItem}
              onPress={() => {
                setHeaderMenuOpen(false);
                navigation.navigate('Profile');
              }}
            >
              <Icon name="person-circle-outline" size={18} color={colors.navy} />
              <AppText style={styles.dropdownItemText}>{ui('Profile')}</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.75}
              style={styles.dropdownItem}
              onPress={() => {
                setHeaderMenuOpen(false);
                navigation.navigate('MyStaffIdentity');
              }}
            >
              <Icon name="id-card-outline" size={18} color={colors.blue} />
              <AppText style={[styles.dropdownItemText, styles.dropdownIdentityText]}>
                {ui('My Staff Identity')}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.75}
              style={[styles.dropdownItem, styles.dropdownLogoutItem]}
              onPress={() => {
                setHeaderMenuOpen(false);
                if (Platform.OS === 'ios') {
                  setTimeout(() => confirmLogout(), 220);
                } else {
                  confirmLogout();
                }
              }}
            >
              <Icon name="log-out-outline" size={18} color="#dc2626" />
              <AppText style={styles.dropdownLogoutText}>{ui('Log out')}</AppText>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

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
  useInterfaceLanguage();
  const label = String(status || 'pending').replace(/_/g, ' ');
  return (
    <View style={styles.pill}>
      <AppText style={styles.pillText}>{label}</AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Platform.OS === 'ios' ? 6 : 8,
    minHeight: 38,
  },
  headerDropdownTrigger: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    height: Platform.OS === 'ios' ? 34 : 36,
    paddingLeft: 4,
    paddingRight: 8,
  },
  headerAvatarCircle: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderRadius: 13,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  headerAvatarText: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 12,
    lineHeight: 15,
  },
  dropdownBackdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.22)',
    flex: 1,
  },
  dropdownCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    elevation: 10,
    position: 'absolute',
    right: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    width: 248,
    overflow: 'hidden',
  },
  dropdownHeader: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownUserName: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: typeScale.sm,
    lineHeight: 20,
  },
  dropdownUserEmail: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 16,
    marginTop: 2,
  },
  dropdownRolePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderRadius: radius.pill,
    borderWidth: 1,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  dropdownRoleText: {
    color: '#047857',
    fontFamily: typography.semibold,
    fontSize: 10,
    lineHeight: 14,
    textTransform: 'uppercase',
  },
  dropdownItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownItemText: {
    color: colors.ink,
    fontFamily: typography.medium,
    fontSize: typeScale.sm,
    lineHeight: 20,
  },
  dropdownIdentityText: {
    color: colors.blue,
    fontFamily: typography.semibold,
  },
  dropdownLogoutItem: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dropdownLogoutText: {
    color: '#dc2626',
    fontFamily: typography.semibold,
    fontSize: typeScale.sm,
    lineHeight: 20,
  },
  shortcutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  shortcutCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: '48%',
    flexDirection: 'row',
    flexGrow: 1,
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  shortcutLogoutCard: {
    borderColor: '#fecaca',
  },
  shortcutIcon: {
    alignItems: 'center',
    borderRadius: 10,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  shortcutLabel: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
  },
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
    fontSize: typeScale.lg,
    lineHeight: 28,
  },
  metricLabel: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
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
    fontSize: typeScale.base,
    lineHeight: 24,
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
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginRight: 10,
  },
  breakdownValue: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: typeScale.sm,
    lineHeight: 20,
  },
  inviteCode: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: typeScale.lg,
    lineHeight: 28,
    letterSpacing: 0.8,
    marginTop: 10,
  },
  inviteUrl: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    marginTop: 4,
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
    fontSize: typeScale.sm,
    lineHeight: 20,
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
    fontSize: typeScale.sm,
    lineHeight: 20,
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
    fontSize: typeScale.reading,
    lineHeight: 22,
  },
  code: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
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
    fontSize: typeScale.xs,
    lineHeight: 18,
    textTransform: 'capitalize',
  },
});

export default MarketingAgentScreen;
