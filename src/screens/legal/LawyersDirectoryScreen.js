import React, { useEffect, useLayoutEffect, useState } from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/Ionicons';
import { legalService } from '../../services/legalService';
import { getErrorMessage, pickList, pickObject } from '../../utils/http';
import { colors, radius, typography } from '../../theme';
import AppText from '../../components/common/AppText';
import {
  ActionRow,
  DashboardHero,
  DashboardScreen,
  DashboardSection,
  MetricCard,
  MetricGrid,
} from '../../components/dashboard/DashboardKit';

const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-NG', { month: 'short', year: 'numeric' });
};

const LawyersDirectoryScreen = ({ navigation }) => {
  const [stats, setStats] = useState({ total_resolved: 0, tenant_against_landlord: 0, landlord_against_tenant: 0 });
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: navigation.canGoBack() });
  }, [navigation]);

  const loadDirectory = async () => {
    setLoading(true);
    try {
      const response = await legalService.getTreatedCases();
      setStats(pickObject(response, ['data', 'stats']) || {});
      setCases(pickList(response, ['data', 'cases']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Directory unavailable',
        text2: getErrorMessage(error, 'Could not load legal coverage data'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory();
  }, []);

  return (
    <DashboardScreen refreshing={loading} onRefresh={loadDirectory}>
      <DashboardHero
        eyebrow="LEGAL COVERAGE"
        title="Treated cases"
        subtitle="A track record of tenancy and property disputes resolved through RentalHub legal coverage."
        icon="scale-outline"
        onRefresh={loadDirectory}
      />

      <MetricGrid>
        <MetricCard color={colors.success} icon="checkmark-done-outline" label="Resolved" value={String(stats.total_resolved || 0)} />
        <MetricCard color={colors.blue} icon="person-outline" label="Tenant cases" value={String(stats.tenant_against_landlord || 0)} />
        <MetricCard color={colors.navy} icon="business-outline" label="Landlord cases" value={String(stats.landlord_against_tenant || 0)} />
      </MetricGrid>

      <DashboardSection title="Legal help">
        <ActionRow
          title="Legal coverage & requests"
          subtitle="Check your coverage and submit a legal assistance request."
          icon="shield-checkmark-outline"
          onPress={() => navigation.navigate('LegalSupport')}
        />
      </DashboardSection>

      <DashboardSection title="Recently treated cases">
        {loading && !cases.length ? <ActivityIndicator color={colors.blue} /> : null}
        {!loading && !cases.length ? (
          <AppText style={styles.empty}>No resolved cases have been published yet.</AppText>
        ) : null}
        {cases.map((item, index) => {
          const isTenant = item.direction === 'tenant_landlord';
          return (
            <View key={String(item.id || index)} style={styles.card}>
              <View style={[styles.iconWrap, isTenant ? styles.iconTenant : styles.iconLandlord]}>
                <Icon name={isTenant ? 'person-outline' : 'business-outline'} size={18} color={isTenant ? '#1D4ED8' : '#334155'} />
              </View>
              <View style={styles.cardCopy}>
                <AppText style={styles.title}>
                  {isTenant ? 'Tenant to landlord' : 'Landlord to tenant'}
                </AppText>
                <AppText style={styles.meta}>
                  {[item.state, formatDate(item.resolved_at)].filter(Boolean).join(' · ') || 'Resolved matter'}
                </AppText>
              </View>
              <Icon name="checkmark-circle" size={20} color={colors.success} />
            </View>
          );
        })}
      </DashboardSection>
    </DashboardScreen>
  );
};

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  iconTenant: { backgroundColor: '#DBEAFE' },
  iconLandlord: { backgroundColor: '#F1F5F9' },
  cardCopy: { flex: 1 },
  title: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 15,
  },
  meta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 3,
  },
  empty: {
    color: colors.muted,
    fontFamily: typography.regular,
    lineHeight: 20,
  },
});

export default LawyersDirectoryScreen;
