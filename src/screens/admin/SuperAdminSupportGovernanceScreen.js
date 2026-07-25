import React, { useEffect, useLayoutEffect, useState } from 'react';
import {FlatList, StyleSheet View} from 'react-native';
import Toast from 'react-native-toast-message';
import api from '../../services/api';
import { colors, typography, radius } from '../../theme';
import { getErrorMessage } from '../../utils/http';
import {

import AppText from '../../components/common/AppText';  DashboardHero,
  DashboardScreen,
  DashboardSection,
  MetricCard,
  MetricGrid,
} from '../../components/dashboard/DashboardKit';

const SuperAdminSupportGovernanceScreen = ({ navigation }) => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await api.get('/support/governance/summary');
      setDashboard(response?.data?.data || {});
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load support governance'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const summary = dashboard?.summary || {};
  const escalatedTickets = Array.isArray(dashboard?.recent_escalations)
    ? dashboard.recent_escalations
    : [];
  const departments = Array.isArray(dashboard?.by_department) ? dashboard.by_department : [];
  const slaBreakdown = Array.isArray(dashboard?.by_sla) ? dashboard.by_sla : [];

  const summaryCards = [
    { label: 'Total Tickets', value: String(summary.total_tickets ?? 0), icon: 'chatbox-ellipses-outline', color: colors.blue },
    { label: 'Active', value: String(summary.active_tickets ?? 0), icon: 'time-outline', color: '#A66B00' },
    { label: 'Escalated', value: String(summary.escalated_tickets ?? 0), icon: 'arrow-up-circle-outline', color: '#7C3AED' },
    { label: 'SLA Breached', value: String(summary.breached_sla ?? 0), icon: 'warning-outline', color: colors.danger },
    { label: 'Unassigned', value: String(summary.unassigned_active ?? 0), icon: 'person-remove-outline', color: colors.warning },
  ];

  return (
    <DashboardScreen refreshing={loading} onRefresh={loadDashboard}>
      <DashboardHero
        eyebrow="GOVERNANCE"
        title="Support governance"
        subtitle="Oversee support operations, response metrics and escalated ticket resolution."
        icon="shield-outline"
        onRefresh={loadDashboard}
      />

      <MetricGrid>
        {summaryCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </MetricGrid>

      <DashboardSection title="Department accountability">
        {departments.length === 0 ? (
          <AppText style={styles.empty}>No department escalations at this time.</AppText>
        ) : (
          departments.map((item, index) => (
            <View key={`${item.department || 'department'}-${index}`} style={styles.ticketCard}>
              <AppText style={styles.ticketTitle}>{formatLabel(item.department || 'Unassigned department')}</AppText>
              <AppText style={styles.ticketMeta}>
                {item.needs_action ?? 0} need action | {item.breached_sla ?? 0} breached | {item.total ?? 0} total
              </AppText>
            </View>
          ))
        )}
      </DashboardSection>

      <DashboardSection title="SLA position">
        {slaBreakdown.length === 0 ? (
          <AppText style={styles.empty}>No SLA breakdown is available.</AppText>
        ) : (
          slaBreakdown.map((item, index) => (
            <View key={`${item.sla_status || 'status'}-${index}`} style={styles.ticketCard}>
              <AppText style={styles.ticketTitle}>{formatLabel(item.sla_status || 'Not set')}</AppText>
              <AppText style={styles.ticketMeta}>{item.total ?? 0} ticket(s)</AppText>
            </View>
          ))
        )}
      </DashboardSection>

      <DashboardSection title="Recent escalated tickets">
        {escalatedTickets.length === 0 ? (
          <AppText style={styles.empty}>No escalated tickets at this time.</AppText>
        ) : (
          <FlatList
            data={escalatedTickets}
            scrollEnabled={false}
            keyExtractor={(item, index) => String(item.id ?? index)}
            renderItem={({ item }) => (
              <View style={styles.ticketCard}>
                <AppText style={styles.ticketTitle}>{item.subject || item.title || `Ticket #${item.id}`}</AppText>
                <AppText style={styles.ticketMeta}>
                  {item.status ? `Status: ${item.status}` : ''}
                  {item.priority ? ` | Priority: ${item.priority}` : ''}
                </AppText>
                <AppText style={styles.ticketMeta}>
                  {formatLabel(item.escalation_department || 'Unassigned department')}
                  {item.escalation_status ? ` | ${formatLabel(item.escalation_status)}` : ''}
                </AppText>
              </View>
            )}
          />
        )}
      </DashboardSection>
    </DashboardScreen>
  );
};

const formatLabel = (value) => String(value || '').replace(/_/g, ' ');

const styles = StyleSheet.create({
  empty: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
  },
  ticketCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: 9,
    padding: 14,
  },
  ticketTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 14,
  },
  ticketMeta: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 4,
  },
});

export default SuperAdminSupportGovernanceScreen;
