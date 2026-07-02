import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { stateAdminService } from '../../services/stateAdminService';
import { AuthContext } from '../../context/AuthContext';
import { getErrorMessage, pickObject } from '../../utils/http';
import PropertyRequestWorkflowSection from '../../components/admin/PropertyRequestWorkflowSection';
import TenancyWorkflowSection from '../../components/admin/TenancyWorkflowSection';

const formatCurrency = (value) => `NGN ${Number(value || 0).toLocaleString()}`;

const StateAdminDashboardScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const stateId = user?.assigned_state || user?.state_id || user?.stateId;

  useEffect(() => {
    if (stateId) loadDashboard();
  }, [stateId]);

  const loadDashboard = async () => {
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
    { label: 'Managed Users', value: overview.total_managed_users ?? '-', color: '#0284c7' },
    { label: 'Pending Commission', value: formatCurrency(overview.total_pending_commission ?? 0), color: '#059669' },
    { label: 'Weekly Withdrawable', value: formatCurrency(overview.weekly_withdrawable ?? 0), color: '#d97706' },
  ];

  const actionCards = [
    { label: 'Property Approvals', icon: 'business-outline', route: 'StateAdminMigrations' },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>State Admin Dashboard</Text>

      <View style={styles.overviewGrid}>
        {overviewCards.map((card) => (
          <View key={card.label} style={[styles.overviewCard, { borderLeftColor: card.color }]}>
            <Text style={styles.overviewLabel}>{card.label}</Text>
            <Text style={[styles.overviewValue, { color: card.color }]}>{card.value}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Management</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('RecruitmentAdmin')}>
          <Icon name='people-outline' size={26} color="#0284c7" />
          <Text style={styles.actionLabel}>Recruitment</Text>
        </TouchableOpacity>
        {actionCards.map((action) => (
          <TouchableOpacity
            key={action.route}
            style={styles.actionCard}
            onPress={() => navigation.navigate(action.route)}
          >
            <Icon name={action.icon} size={26} color="#0284c7" />
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <PropertyRequestWorkflowSection mode="state" title="State Tenant Property Requests" />
      <TenancyWorkflowSection title="State Tenancy Grace and Refund Enablement" />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 14 },
  overviewGrid: { gap: 8, marginBottom: 20 },
  overviewCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    borderRadius: 12,
    padding: 14,
  },
  overviewLabel: { color: '#64748b', fontSize: 13 },
  overviewValue: { fontSize: 24, fontWeight: '800', marginTop: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionCard: {
    width: '30%',
    flexGrow: 1,
    minWidth: 100,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  actionLabel: { color: '#0f172a', fontSize: 11, fontWeight: '600', textAlign: 'center' },
});

export default StateAdminDashboardScreen;
