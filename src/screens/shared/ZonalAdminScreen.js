

import React, { useCallback, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
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
import { colors, radius, typography, typeScale } from '../../theme';
import Button from '../../components/common/Button';
import AppText from '../../components/common/AppText';
import TourTarget from '../../components/tour/TourTarget';
import { DashboardScreen } from '../../components/dashboard/DashboardKit';
import useAdminNotificationHeader from '../../hooks/useAdminNotificationHeader';

const ZonalAdminScreen = ({ navigation }) => {
  useAdminNotificationHeader(navigation);

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
        text1: "Failed",
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
    return <PremiumCenter loading title={"Loading zonal overview"} />;
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
    <DashboardScreen refreshing={loading} onRefresh={load} contentContainerStyle={styles.content}>
      <PremiumHero
        eyebrow={"Zonal admin"}
        title={"Zone overview"}
        subtitle={`${(scope.assignedZone || "Your zone") ?? "{value0}"}${(states.length ? ` · ${states.length} states` : '') ?? "{value1}"}`}
        icon="business-outline"
      />

      <Button title={"Assisted registration & receipts"} onPress={()=>navigation.navigate('AssistedRegistration')} variant="outline" />
      <TourTarget id="zonal_overview" label={"Zone metrics"}><View style={styles.metricRow}>
        {metric('Users', data?.totalUsers ?? 0)}
        {metric('Properties', data?.totalProperties ?? 0)}
        {metric('Applications', data?.applications ?? 0)}
      </View></TourTarget>
      <View style={styles.metricRow}>
        {metric('Pending verif.', data?.pendingVerifications ?? 0)}
        {metric('Open escalations', data?.openEscalations ?? 0)}
      </View>

      <TourTarget id="zonal_workspaces" label={"Zonal workspaces"}><View style={styles.quickRow}>
        {[
          { key: 'admins', label: "Admins" },
          { key: 'users', label: "Users" },
          { key: 'properties', label: "Properties" },
          { key: 'applications', label: "Applications" },
          { key: 'verifications', label: "Verifications" },
          { key: 'escalations', label: "Escalations" },
          { key: 'service-operations', label: "Service ops" },
        ].map((item) => (
          <TouchableOpacity
            key={item.key}
            activeOpacity={0.85}
            style={styles.quick}
            onPress={() => navigation.navigate('ZonalList', { resource: item.key })}
          >
            <AppText style={styles.quickText}>{item.label}</AppText>
          </TouchableOpacity>
        ))}
      </View></TourTarget>

      <TourTarget id="zonal_scope" label={"States in your assigned zone"}><PremiumCard>
        <AppText style={styles.sectionTitle}>{"States in zone"}</AppText>
        {perf.length === 0 ? (
          <AppText style={styles.empty}>{"No state data available."}</AppText>
        ) : (
          perf.map((row) => (
            <View key={row.state_name} style={styles.stateRow}>
              <AppText style={styles.stateName}>{row.state_name}</AppText>
              <AppText style={styles.stateMeta}>
                {row.properties}{" properties · "}{row.applications}{"applications"}</AppText>
            </View>
          ))
        )}
      </PremiumCard></TourTarget>

      <PremiumCard>
        <InfoRow
          icon="information-circle-outline"
          label={"Scope"}
          value={states.join(', ') || scope.assignedZone || '—'}
        />
      </PremiumCard>
    </DashboardScreen>
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
  sectionTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: typeScale.reading,
    lineHeight: 22,
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
    fontSize: typeScale.sm,
    lineHeight: 20,
  },
  stateMeta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 2,
  },
  empty: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  quick: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickText: {
    color: colors.blue,
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
});

export default ZonalAdminScreen;
