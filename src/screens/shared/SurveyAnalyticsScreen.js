import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';
import {
  InfoRow,
  PremiumButton,
  PremiumCard,
  PremiumCenter,
  PremiumHero,
} from '../../components/common/PremiumLayout';
import { surveyAnalyticsService } from '../../services/surveyAnalyticsService';
import { getErrorMessage } from '../../utils/http';
import { colors, radius, typography } from '../../theme';
import AppText from '../../components/common/AppText';

const mmss = (seconds) => {
  const s = Number(seconds || 0);
  const mins = Math.floor(s / 60);
  const secs = Math.round(s % 60);
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
};

const SurveyAnalyticsScreen = () => {
  const [tab, setTab] = useState('tenant');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [enablingAll, setEnablingAll] = useState(false);

  const enableAllNigerianLgas = async () => {
    setEnablingAll(true);
    setError('');
    try {
      const res = await surveyAnalyticsService.enableAllNigerianLgas();
      Toast.show({ type: 'success', text1: 'Survey enabled', text2: res?.message || 'All Nigerian LGAs enabled.' });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not enable all locations'));
    } finally {
      setEnablingAll(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await surveyAnalyticsService.getAnalysis(tab);
      if (response?.success && response?.data) {
        setData(response.data);
      } else {
        setData(null);
        setError(response?.message || 'No analytics available.');
      }
    } catch (err) {
      setData(null);
      setError(getErrorMessage(err, 'Could not load survey analytics'));
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return <PremiumCenter loading title="Loading analytics" />;
  }

  const meta = data?.meta || {};
  const total = Number(meta.total || 0);
  const completed = Number(meta.completed || 0);
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const states = Array.isArray(meta.by_state) ? meta.by_state.slice(0, 6) : [];
  const sources = meta.by_source || {};
  const openCount = Array.isArray(data?.open_answers) ? data.open_answers.length : 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <PremiumHero
        eyebrow="Super admin"
        title="Survey analytics"
        subtitle="Read-only summary of onboarding survey responses."
        icon="analytics-outline"
      />

      <View style={styles.tabRow}>
        {['tenant', 'landlord'].map((key) => {
          const active = tab === key;
          return (
            <TouchableOpacity
              key={key}
              activeOpacity={0.85}
              onPress={() => setTab(key)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <AppText style={[styles.tabText, active && styles.tabTextActive]}>
                {key[0].toUpperCase() + key.slice(1)}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>

      <PremiumCard>
        <PremiumButton
          title={enablingAll ? 'Enabling…' : 'Enable survey in all Nigerian LGAs'}
          onPress={enableAllNigerianLgas}
          loading={enablingAll}
          variant="secondary"
          icon="globe-outline"
        />
      </PremiumCard>

      {error ? (
        <PremiumCard>
          <AppText style={styles.empty}>{error}</AppText>
        </PremiumCard>
      ) : (
        <>
          <View style={styles.metricRow}>
            <View style={[styles.metric, styles.metricAccent]}>
              <AppText style={styles.metricValue}>{total}</AppText>
              <AppText style={styles.metricLabel}>Responses</AppText>
            </View>
            <View style={styles.metric}>
              <AppText style={styles.metricValue}>{completed}</AppText>
              <AppText style={styles.metricLabel}>Completed</AppText>
            </View>
            <View style={styles.metric}>
              <AppText style={styles.metricValue}>{rate}%</AppText>
              <AppText style={styles.metricLabel}>Completion</AppText>
            </View>
          </View>

          <PremiumCard>
            <InfoRow icon="time-outline" label="Avg. time" value={mmss(meta.avg_time_seconds)} />
            <InfoRow icon="chatbox-outline" label="Open answers" value={String(openCount)} />
            <InfoRow
              icon="pulse-outline"
              label="Sources"
              value={Object.keys(sources)
                .map((key) => `${key}: ${sources[key]}`)
                .join(', ') || '—'}
            />
            <InfoRow icon="refresh-outline" label="Generated" value={data?.generated_at ? new Date(data.generated_at).toLocaleString() : '—'} />
          </PremiumCard>

          <PremiumCard>
            <AppText style={styles.sectionTitle}>Top states</AppText>
            {states.length === 0 ? (
              <AppText style={styles.empty}>No state breakdown available.</AppText>
            ) : (
              states.map((row) => (
                <View key={row.state} style={styles.stateRow}>
                  <AppText style={styles.stateName}>{row.state}</AppText>
                  <AppText style={styles.stateCount}>{row.count}</AppText>
                </View>
              ))
            )}
          </PremiumCard>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: 18,
    paddingBottom: 36,
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
    paddingVertical: 14,
    alignItems: 'center',
  },
  metricAccent: {
    backgroundColor: colors.surfaceBlue,
    borderColor: colors.blue,
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
  sectionTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 15,
    marginBottom: 8,
  },
  stateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  stateName: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 14,
  },
  stateCount: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 14,
  },
  empty: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
  },
});

export default SurveyAnalyticsScreen;
