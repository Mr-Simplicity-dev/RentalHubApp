import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';
import {
  InfoRow,
  PremiumCard,
  PremiumCenter,
  PremiumHero,
} from '../../components/common/PremiumLayout';
import { zonalAdminService } from '../../services/zonalAdminService';
import { getErrorMessage } from '../../utils/http';
import { colors, radius, typography } from '../../theme';
import AppText from '../../components/common/AppText';

const ZonalAdminScreen = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await zonalAdminService.getDashboard();
      setData(response?.data || null);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(err, 'Could not load your zonal dashboard'),
      });
      setData(null);
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
    return <PremiumCenter loading title="Loading zonal overview" />;
  }

  const metric = (label, value) => (
    <View style={styles.metric}>
      <AppText style={styles.metricValue}>{value}</AppText>
      <AppText style={styles.metricLabel}>{label}</AppText>
    </View>
  );

  const scope = data?.scope || {};
  const states = Array.isArray(scope.states) ? scope.states : [];
  const perf = Array.isArray(data?.statePerformance) ? data.statePerformance : [];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <PremiumHero
        eyebrow="Zonal admin"
        title="Zone overview"
        subtitle={`${scope.assignedZone || 'Your zone'}${states.length ? ` · ${states.length} states` : ''}`}
        icon="business-outline"
      />

      <View style={styles.metricRow}>
        {metric('Users', data?.totalUsers ?? 0)}
        {metric('Properties', data?.totalProperties ?? 0)}
        {metric('Applications', data?.applications ?? 0)}
      </View>
      <View style={styles.metricRow}>
        {metric('Pending verif.', data?.pendingVerifications ?? 0)}
        {metric('Open escalations', data?.openEscalations ?? 0)}
      </View>

      <PremiumCard>
        <AppText style={styles.sectionTitle}>States in zone</AppText>
        {perf.length === 0 ? (
          <AppText style={styles.empty}>No state data available.</AppText>
        ) : (
          perf.map((row) => (
            <View key={row.state_name} style={styles.stateRow}>
              <AppText style={styles.stateName}>{row.state_name}</AppText>
              <AppText style={styles.stateMeta}>
                {row.properties} properties · {row.applications} applications
              </AppText>
            </View>
          ))
        )}
      </PremiumCard>

      <PremiumCard>
        <InfoRow
          icon="information-circle-outline"
          label="Scope"
          value={states.join(', ') || scope.assignedZone || '—'}
        />
      </PremiumCard>
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
  metricRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
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
    fontSize: 20,
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
    paddingVertical: 8,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  stateName: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  stateMeta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    marginTop: 2,
  },
  empty: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
  },
});

export default ZonalAdminScreen;
