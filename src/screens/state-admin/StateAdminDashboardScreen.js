import React, { useEffect, useLayoutEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { stateAdminService } from '../../services/stateAdminService';
import { AuthContext } from '../../context/AuthContext';
import { getErrorMessage, pickObject } from '../../utils/http';
import PropertyRequestWorkflowSection from '../../components/admin/PropertyRequestWorkflowSection';
import TenancyWorkflowSection from '../../components/admin/TenancyWorkflowSection';
import { colors, radius, shadows, typography } from '../../theme';

const formatCurrency = (value) => `₦${Number(value || 0).toLocaleString()}`;

const StateAdminDashboardScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const stateId = user?.assigned_state || user?.state_id || user?.stateId;

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    if (stateId) loadDashboard();
  }, [stateId]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await stateAdminService.getStateDashboardData();
      setDashboard(pickObject(response, ['data', 'dashboard']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load state dashboard'),
      });
    } finally {
      setLoading(false);
    }
  };

  const overview = dashboard?.summary || dashboard || {};

  const overviewCards = [
    { label: 'Managed users', value: overview.total_managed_users ?? '-', icon: 'people-outline', color: colors.blue },
    { label: 'Pending commission', value: formatCurrency(overview.total_pending_commission ?? 0), icon: 'hourglass-outline', color: '#A66B00' },
    { label: 'Weekly available', value: formatCurrency(overview.weekly_withdrawable ?? 0), icon: 'wallet-outline', color: colors.success },
  ];

  const actionCards = [
    { label: 'Property Approvals', icon: 'business-outline', route: 'StateAdminMigrations' },
  ];

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadDashboard} tintColor={colors.blue} />}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}><Icon name="map-outline" size={24} color={colors.gold} /></View>
        <Text style={styles.eyebrow}>STATE OPERATIONS</Text>
        <Text style={styles.title}>{user?.assigned_state_name || user?.state_name || 'Your state'} command centre</Text>
        <Text style={styles.subtitle}>Manage local users, approvals, tenancy workflows and commissions.</Text>
      </View>

      <View style={styles.overviewGrid}>
        {overviewCards.map((card) => (
          <View key={card.label} style={styles.overviewCard}>
            <View style={[styles.metricIcon, { backgroundColor: `${card.color}16` }]}><Icon name={card.icon} size={18} color={card.color} /></View>
            <Text style={styles.overviewLabel}>{card.label}</Text>
            <Text style={styles.overviewValue}>{card.value}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Management tools</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('RecruitmentAdmin')}>
          <View style={styles.actionIcon}><Icon name='people-outline' size={21} color={colors.blue} /></View>
          <Text style={styles.actionLabel}>Recruitment</Text>
          <Icon name="chevron-forward" size={17} color={colors.muted} />
        </TouchableOpacity>
        {actionCards.map((action) => (
          <TouchableOpacity
            key={action.route}
            style={styles.actionCard}
            onPress={() => navigation.navigate(action.route)}
          >
            <View style={styles.actionIcon}><Icon name={action.icon} size={21} color={colors.blue} /></View>
            <Text style={styles.actionLabel}>{action.label}</Text>
            <Icon name="chevron-forward" size={17} color={colors.muted} />
          </TouchableOpacity>
        ))}
      </View>

      <PropertyRequestWorkflowSection mode="state" title="State Tenant Property Requests" />
      <TenancyWorkflowSection title="State Tenancy Grace and Refund Enablement" />
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 18, paddingBottom: 36 },
  hero: { backgroundColor: colors.navy, borderRadius: radius.lg, padding: 22, marginBottom: 14, ...shadows.soft },
  heroIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.navySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  eyebrow: { fontFamily: typography.semibold, fontSize: 11, letterSpacing: 1.2, color: colors.gold },
  title: { marginTop: 8, fontFamily: typography.bold, fontSize: 27, color: colors.white },
  subtitle: { marginTop: 7, fontFamily: typography.regular, lineHeight: 20, color: '#B9C9E5' },
  overviewGrid: { flexDirection: 'row', gap: 8, marginBottom: 23 },
  overviewCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 10,
  },
  metricIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  overviewLabel: { fontFamily: typography.regular, color: colors.muted, fontSize: 10 },
  overviewValue: { fontFamily: typography.bold, fontSize: 13, color: colors.ink, marginTop: 4 },
  sectionTitle: { fontFamily: typography.bold, fontSize: 18, color: colors.ink, marginBottom: 10 },
  actionsGrid: { gap: 9, marginBottom: 22 },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 13,
  },
  actionIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surfaceBlue, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  actionLabel: { flex: 1, fontFamily: typography.semibold, color: colors.ink },
});

export default StateAdminDashboardScreen;
