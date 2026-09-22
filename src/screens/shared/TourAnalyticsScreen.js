import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { tourService } from '../../services/tourService';
import { colors, radius, typography } from '../../theme';
import { getErrorMessage, pickObject } from '../../utils/http';

import AppText from '../../components/common/AppText';

const PERIODS = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '1 year' },
];

const PLATFORMS = [
  { value: '', label: 'All' },
  { value: 'web', label: 'Web' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'legacy', label: 'Legacy' },
];

const number = (value) => Number(value || 0).toLocaleString();

const TourAnalyticsScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [days, setDays] = useState('30');
  const [platform, setPlatform] = useState('');
  const [data, setData] = useState(null);

  const load = useCallback(async ({ refresh = false } = {}) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const params = { days };
      if (platform) params.platform = platform;
      const response = await tourService.getAnalytics(params);
      setData(pickObject(response, ['data']));
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not load tour analytics', text2: getErrorMessage(error, 'Please try again.') });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [days, platform]);

  useEffect(() => {
    load();
  }, [load]);

  const overview = data?.overview || {};
  const funnel = [
    { label: 'Engaged users', value: overview.engaged_users },
    { label: 'Started', value: overview.started_users },
    { label: 'Resumed', value: overview.resumed_users },
    { label: 'Completed', value: overview.completed_users },
  ];
  const problems = Array.isArray(data?.problems) ? data.problems.slice(0, 8) : [];
  const issues = Array.isArray(data?.issues) ? data.issues.slice(0, 12) : [];

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl colors={[colors.blue]} onRefresh={() => load({ refresh: true })} refreshing={refreshing} tintColor={colors.blue} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <AppText style={styles.heroEyebrow}>PRODUCT ADOPTION INTELLIGENCE</AppText>
          <AppText style={styles.heroTitle}>Guided tour analytics</AppText>
          <AppText style={styles.heroSub}>
            See where users succeed, resume, skip, or encounter unavailable controls across web and mobile tours.
          </AppText>
        </View>

        <AppText style={styles.filterLabel}>Period</AppText>
        <View style={styles.chipWrap}>
          {PERIODS.map((option) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => setDays(option.value)}
              style={[styles.chip, days === option.value && styles.chipActive]}
            >
              <AppText style={[styles.chipText, days === option.value && styles.chipTextActive]}>{option.label}</AppText>
            </TouchableOpacity>
          ))}
        </View>

        <AppText style={styles.filterLabel}>Platform</AppText>
        <View style={styles.chipWrap}>
          {PLATFORMS.map((option) => (
            <TouchableOpacity
              key={option.value || 'all'}
              onPress={() => setPlatform(option.value)}
              style={[styles.chip, platform === option.value && styles.chipActive]}
            >
              <AppText style={[styles.chipText, platform === option.value && styles.chipTextActive]}>{option.label}</AppText>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.blue} size="large" />
            <AppText style={styles.loadingText}>Loading tour analytics…</AppText>
          </View>
        ) : (
          <>
            <View style={styles.metricGrid}>
              {funnel.map((item) => (
                <View key={item.label} style={styles.metricCard}>
                  <AppText style={styles.metricValue}>{number(item.value)}</AppText>
                  <AppText style={styles.metricLabel}>{item.label}</AppText>
                </View>
              ))}
            </View>

            <View style={styles.completionCard}>
              <AppText style={styles.completionLabel}>Completion rate</AppText>
              <AppText style={styles.completionValue}>{Number(overview.completion_rate || 0).toFixed(1)}%</AppText>
            </View>

            <View style={styles.card}>
              <AppText style={styles.cardTitle}>Top problems</AppText>
              {problems.length === 0 ? (
                <AppText style={styles.mutedText}>No problem steps recorded in this period.</AppText>
              ) : problems.map((problem, index) => (
                <View key={`${problem.step_id || problem.label || index}`} style={styles.listRow}>
                  <View style={styles.listBody}>
                    <AppText style={styles.listTitle}>
                      {problem.label || problem.step_id || problem.title || `Step ${index + 1}`}
                    </AppText>
                    {problem.detail ? <AppText style={styles.listMeta}>{problem.detail}</AppText> : null}
                  </View>
                  <AppText style={styles.listCount}>{number(problem.count || problem.total || 0)}</AppText>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <AppText style={styles.cardTitle}>Recent issues</AppText>
              {issues.length === 0 ? (
                <AppText style={styles.mutedText}>No issues recorded in this period.</AppText>
              ) : issues.map((issue, index) => (
                <View key={`${issue.id || index}`} style={styles.issueRow}>
                  <Icon name="alert-circle-outline" size={17} color="#B46B00" />
                  <View style={styles.listBody}>
                    <AppText style={styles.listTitle}>
                      {issue.event_type || issue.type || 'Tour event'}
                      {issue.step_id ? ` · ${issue.step_id}` : ''}
                    </AppText>
                    <AppText style={styles.listMeta}>
                      {[issue.platform, issue.tour_key, issue.created_at ? new Date(issue.created_at).toLocaleDateString() : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </AppText>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.surface, flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  hero: {
    backgroundColor: '#0B2F69',
    borderRadius: radius.lg,
    padding: 18,
  },
  heroEyebrow: { color: '#FFE58A', fontFamily: typography.bold, fontSize: 11, letterSpacing: 1.1 },
  heroTitle: { color: colors.white, fontFamily: typography.bold, fontSize: 22, marginTop: 6 },
  heroSub: { color: '#DCE6F7', fontFamily: typography.regular, fontSize: 12, lineHeight: 18, marginTop: 8 },
  filterLabel: { color: colors.text, fontFamily: typography.semibold, fontSize: 12, marginBottom: 6, marginTop: 14 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { color: colors.text, fontFamily: typography.medium, fontSize: 12 },
  chipTextActive: { color: colors.white, fontFamily: typography.semibold },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  loadingText: { color: colors.muted, fontFamily: typography.medium, fontSize: 13, marginTop: 12 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  metricCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    minWidth: '47%',
    paddingVertical: 16,
  },
  metricValue: { color: colors.ink, fontFamily: typography.bold, fontSize: 22 },
  metricLabel: { color: colors.muted, fontFamily: typography.medium, fontSize: 12, marginTop: 4 },
  completionCard: {
    alignItems: 'center',
    backgroundColor: '#EEF5FF',
    borderRadius: radius.md,
    marginTop: 12,
    padding: 16,
  },
  completionLabel: { color: '#1D4ED8', fontFamily: typography.semibold, fontSize: 12 },
  completionValue: { color: '#1D4ED8', fontFamily: typography.bold, fontSize: 28, marginTop: 4 },
  card: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: 14,
    padding: 15,
  },
  cardTitle: { color: colors.ink, fontFamily: typography.bold, fontSize: 15, marginBottom: 10 },
  mutedText: { color: colors.muted, fontFamily: typography.regular, fontSize: 13 },
  listRow: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', paddingVertical: 10 },
  issueRow: { alignItems: 'flex-start', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', gap: 8, paddingVertical: 10 },
  listBody: { flex: 1 },
  listTitle: { color: colors.ink, fontFamily: typography.semibold, fontSize: 13 },
  listMeta: { color: colors.muted, fontFamily: typography.regular, fontSize: 12, marginTop: 3 },
  listCount: { color: colors.ink, fontFamily: typography.bold, fontSize: 15, marginLeft: 10 },
});

export default TourAnalyticsScreen;
