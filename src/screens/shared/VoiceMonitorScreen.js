import React, { useCallback, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';
import {
  InfoRow,
  PremiumCard,
  PremiumCenter,
  PremiumHero,
  PremiumListScreen,
  StatusPill,
} from '../../components/common/PremiumLayout';
import { voiceMonitorService } from '../../services/voiceMonitorService';
import { getErrorMessage, pickList } from '../../utils/http';
import { colors, radius, typography } from '../../theme';
import AppText from '../../components/common/AppText';

const formatTime = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
};

const STATUS_COLORS = {
  completed: colors.success,
  ringing: colors.blue,
  in_progress: colors.success,
  no_answer: colors.danger,
  busy: colors.danger,
  failed: colors.danger,
  cancelled: colors.muted,
};

const VoiceMonitorScreen = () => {
  const [tab, setTab] = useState('summary');
  const [summary, setSummary] = useState(null);
  const [log, setLog] = useState([]);
  const [callbacks, setCallbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, logRes, callbacksRes] = await Promise.all([
        voiceMonitorService.summary().catch(() => ({ data: null })),
        voiceMonitorService.callLog().catch(() => ({ data: [] })),
        voiceMonitorService.callbacks().catch(() => ({ data: [] })),
      ]);
      setSummary(summaryRes?.data || null);
      setLog(pickList(logRes?.data || logRes, ['data']));
      setCallbacks(pickList(callbacksRes?.data || callbacksRes, ['data']));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return <PremiumCenter loading title="Loading voice console" />;
  }

  const tabs = [
    { key: 'summary', label: 'Summary' },
    { key: 'calls', label: 'Call log' },
    { key: 'callbacks', label: 'Callbacks' },
  ];

  const header = (
    <>
      <PremiumHero
        eyebrow="Voice console"
        title="Live voice monitor"
        subtitle="Read-only call log, callback requests and day counters for the support line."
        icon="call-outline"
      />
      <View style={styles.tabRow}>
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              activeOpacity={0.85}
              onPress={() => setTab(t.key)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <AppText style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );

  if (tab === 'summary') {
    const metric = (label, value) => (
      <View style={[styles.metric, styles.metricAccent]}>
        <AppText style={styles.metricValue}>{value ?? 0}</AppText>
        <AppText style={styles.metricLabel}>{label}</AppText>
      </View>
    );
    return (
      <View style={styles.screenView}>
        {header}
        <View style={styles.metricRow}>
          {metric('Calls today', summary?.callsToday)}
          {metric('Callback requests', summary?.callbackRequests)}
          {metric('Open escalations', summary?.openEscalations)}
        </View>
        <PremiumCard>
          <AppText style={styles.note}>
            Super admin / support roles can view these counters and records read-only from the app.
          </AppText>
        </PremiumCard>
      </View>
    );
  }

  if (tab === 'calls') {
    return (
      <PremiumListScreen
        data={log}
        keyExtractor={(item, index) => `${item.call_sid}-${index}`}
        refreshing={false}
        onRefresh={load}
        header={header}
        emptyTitle="No calls recorded"
        emptyMessage="Calls on the support line will appear here."
        emptyIcon="call-outline"
        renderItem={({ item }) => (
          <PremiumCard>
            <View style={styles.cardTop}>
              <View style={styles.cardCopy}>
                <AppText style={styles.cardTitle}>{item.direction === 'outbound' ? 'Outbound' : 'Inbound'} · {item.source || 'line'}</AppText>
                <AppText style={styles.cardMeta}>
                  {item.from_number || '—'} → {item.to_number || '—'}
                </AppText>
              </View>
              <StatusPill label={item.status} color={STATUS_COLORS[item.status] || colors.blue} />
            </View>
            <InfoRow icon="timer-outline" label="Duration (s)" value={String(item.duration_sec ?? 0)} />
            <InfoRow icon="time-outline" label="When" value={formatTime(item.created_at)} />
            {item.jurisdiction_state ? (
              <InfoRow icon="location-outline" label="Jurisdiction" value={[item.jurisdiction_state, item.jurisdiction_lga].filter(Boolean).join(' · ') || item.jurisdiction_state} />
            ) : null}
          </PremiumCard>
        )}
      />
    );
  }

  return (
    <PremiumListScreen
      data={callbacks}
      keyExtractor={(item) => String(item.id)}
      refreshing={false}
      onRefresh={load}
      header={header}
      emptyTitle="No callback requests"
      emptyMessage="After-hours callback requests will appear here."
      emptyIcon="chatbubble-outline"
      renderItem={({ item }) => (
        <PremiumCard>
          <View style={styles.cardTop}>
            <View style={styles.cardCopy}>
              <AppText style={styles.cardTitle}>{item.phone_number || `Callback #${item.id}`}</AppText>
              <AppText style={styles.cardMeta}>{item.source || 'line'}</AppText>
            </View>
          </View>
          {item.call_sid ? <InfoRow icon="call-outline" label="Call SID" value={item.call_sid} /> : null}
          {item.jurisdiction_state ? (
            <InfoRow icon="location-outline" label="Jurisdiction" value={[item.jurisdiction_state, item.jurisdiction_lga].filter(Boolean).join(' · ') || item.jurisdiction_state} />
          ) : null}
          <InfoRow icon="time-outline" label="Requested" value={formatTime(item.created_at)} />
        </PremiumCard>
      )}
    />
  );
};

const styles = StyleSheet.create({
  screenView: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 18,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: colors.white,
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
  metricRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
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
    textTransform: 'capitalize',
  },
  cardMeta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    marginTop: 2,
  },
  note: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 19,
  },
});

export default VoiceMonitorScreen;
