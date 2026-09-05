import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';
import Input from '../../components/common/Input';
import {
  InfoRow,
  PremiumButton,
  PremiumCard,
  PremiumCenter,
  PremiumHero,
  PremiumListScreen,
  StatusPill,
} from '../../components/common/PremiumLayout';
import { marketingOpsService } from '../../services/marketingOpsService';
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

const MARKETING_STATUS_COLORS = {
  draft: colors.muted,
  scheduled: '#B7791F',
  sending: colors.blue,
  sent: colors.success,
  failed: colors.danger,
  cancelled: colors.muted,
};

const MARKETING = {
  email: {
    label: 'Email',
    loadStats: marketingOpsService.emailStats,
    loadCampaigns: marketingOpsService.emailCampaigns,
    send: marketingOpsService.sendEmailCampaign,
    retry: null,
  },
  sms: {
    label: 'SMS',
    loadStats: marketingOpsService.smsStats,
    loadCampaigns: marketingOpsService.smsCampaigns,
    send: marketingOpsService.sendSmsCampaign,
    retry: marketingOpsService.retrySmsCampaign,
  },
};

const MarketingScreen = () => {
  const [channel, setChannel] = useState('email');
  const [stats, setStats] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);

  const load = useCallback(async () => {
    const ops = MARKETING[channel];
    if (!ops) return;
    setLoading(true);
    try {
      const [statsRes, campaignsRes] = await Promise.all([
        ops.loadStats(),
        ops.loadCampaigns(),
      ]);
      setStats(statsRes?.data || null);
      setCampaigns(pickList(campaignsRes?.data || campaignsRes, ['data']));
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(err, `Could not load ${channel} campaigns`),
      });
      setStats(null);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [channel]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const act = async (campaignId, action, successText) => {
    const ops = MARKETING[channel];
    setBusyKey(`${campaignId}:${action}`);
    try {
      await (action === 'send'
        ? ops.send(campaignId)
        : ops.retry(campaignId));
      Toast.show({ type: 'success', text1: successText });
      await load();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(err, 'Could not update the campaign'),
      });
    } finally {
      setBusyKey(null);
    }
  };

  if (loading && campaigns.length === 0) {
    return <PremiumCenter loading title="Loading campaigns" />;
  }

  const subscribers = stats?.subscribers || {};
  const campaignStats = stats?.campaigns || {};

  return (
    <PremiumListScreen
      data={campaigns}
      keyExtractor={(item) => String(item.id)}
      refreshing={false}
      onRefresh={load}
      header={
        <>
          <PremiumHero
            eyebrow="Super admin"
            title="Email & SMS marketing"
            subtitle="Monitor subscribers, campaign delivery and launch drafted campaigns."
            icon="megaphone-outline"
          />
          <View style={styles.tabRow}>
            {Object.keys(MARKETING).map((key) => {
              const active = channel === key;
              return (
                <PremiumButton
                  key={key}
                  title={MARKETING[key].label}
                  variant={active ? 'primary' : 'secondary'}
                  onPress={() => setChannel(key)}
                  style={styles.tabButton}
                />
              );
            })}
          </View>

          <View style={styles.metricRow}>
            <View style={[styles.metric, styles.metricAccent]}>
              <AppText style={styles.metricValue}>
                {Number(subscribers.total ?? campaignStats.total ?? 0)}
              </AppText>
              <AppText style={styles.metricLabel}>Subscribers</AppText>
            </View>
            <View style={styles.metric}>
              <AppText style={styles.metricValue}>{Number(campaignStats.sent ?? campaignStats.total ?? 0)}</AppText>
              <AppText style={styles.metricLabel}>Campaigns</AppText>
            </View>
            <View style={styles.metric}>
              <AppText style={styles.metricValue}>
                {Number(stats?.monthlySent ?? 0).toLocaleString()}
              </AppText>
              <AppText style={styles.metricLabel}>Sent / 30d</AppText>
            </View>
          </View>
        </>
      }
      emptyTitle="No campaigns yet"
      emptyMessage={`No ${channel} marketing campaigns found.`}
      emptyIcon="mail-outline"
      renderItem={({ item }) => {
        const statsRow = item.stats || {};
        const color = MARKETING_STATUS_COLORS[item.status] || colors.muted;
        const isDraft = item.status === 'draft';
        const isFailed = item.status === 'failed';
        return (
          <PremiumCard>
            <View style={styles.cardTop}>
              <View style={styles.cardCopy}>
                <AppText style={styles.cardTitle}>{item.name || `Campaign #${item.id}`}</AppText>
                {item.subject ? <AppText style={styles.cardMeta}>{item.subject}</AppText> : null}
                {item.created_at ? (
                  <AppText style={styles.cardMeta}>Created {formatDate(item.created_at)}</AppText>
                ) : null}
              </View>
              <StatusPill label={item.status} color={color} />
            </View>
            <InfoRow icon="paper-plane-outline" label="Sent" value={String(statsRow.sent ?? 0)} />
            <InfoRow icon="alert-circle-outline" label="Failed" value={String(statsRow.failed ?? 0)} />
            {channel === 'email' ? (
              <InfoRow icon="eye-outline" label="Opened" value={String(statsRow.opened ?? 0)} />
            ) : null}
            {item.sent_at ? (
              <InfoRow icon="checkmark-done-outline" label="Sent at" value={formatDate(item.sent_at)} />
            ) : null}

            {(isDraft || isFailed) ? (
              <View style={styles.actions}>
                {isDraft ? (
                  <PremiumButton
                    title="Send now"
                    onPress={() => act(item.id, 'send', `${channel.toUpperCase()} campaign sent`)}
                    loading={busyKey === `${item.id}:send`}
                    icon="send-outline"
                    style={styles.actionButton}
                  />
                ) : null}
                {isFailed && MARKETING[channel].retry ? (
                  <PremiumButton
                    title="Retry"
                    variant="secondary"
                    onPress={() => act(item.id, 'retry', `${channel.toUpperCase()} campaign retried`)}
                    loading={busyKey === `${item.id}:retry`}
                    icon="refresh-outline"
                    style={styles.actionButton}
                  />
                ) : null}
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
    marginBottom: 14,
  },
  tabButton: {
    flex: 1,
    minWidth: 110,
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
  metricAccent: {
    backgroundColor: colors.surfaceBlue,
    borderColor: colors.blue,
  },
  metricValue: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 20,
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
  },
  cardMeta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: 120,
  },
});

export default MarketingScreen;
