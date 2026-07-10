import React, { useEffect, useLayoutEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import api from '../../services/api';
import { colors, typography, radius } from '../../theme';
import { getErrorMessage, pickObject, pickList } from '../../utils/http';
import {
  DashboardHero,
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
      const response = await api.get('/super/support/governance');
      setDashboard(pickObject(response, ['data', 'dashboard']) || {});
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

  const openTickets = dashboard?.open_tickets ?? dashboard?.openTickets ?? 0;
  const avgResponseTime = dashboard?.avg_response_time ?? dashboard?.avgResponseTime ?? '-';
  const satisfactionRate = dashboard?.satisfaction_rate ?? dashboard?.satisfactionRate ?? '-';
  const escalatedTickets = pickList(dashboard, ['escalated_tickets', 'escalated']) || [];

  const summaryCards = [
    { label: 'Open Tickets', value: String(openTickets), icon: 'chatbox-ellipses-outline', color: colors.blue },
    { label: 'Avg Response', value: String(avgResponseTime), icon: 'time-outline', color: '#A66B00' },
    { label: 'Satisfaction', value: String(satisfactionRate), icon: 'happy-outline', color: colors.success },
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

      <DashboardSection title="Recent escalated tickets">
        {escalatedTickets.length === 0 ? (
          <Text style={styles.empty}>No escalated tickets at this time.</Text>
        ) : (
          <FlatList
            data={escalatedTickets}
            scrollEnabled={false}
            keyExtractor={(item, index) => String(item.id ?? index)}
            renderItem={({ item }) => (
              <View style={styles.ticketCard}>
                <Text style={styles.ticketTitle}>{item.subject || item.title || `Ticket #${item.id}`}</Text>
                <Text style={styles.ticketMeta}>
                  {item.status ? `Status: ${item.status}` : ''}
                  {item.priority ? ` | Priority: ${item.priority}` : ''}
                </Text>
                {item.assigned_to ? <Text style={styles.ticketMeta}>Assigned to: {item.assigned_to}</Text> : null}
              </View>
            )}
          />
        )}
      </DashboardSection>
    </DashboardScreen>
  );
};

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
    fontSize: 12,
    marginTop: 4,
  },
});

export default SuperAdminSupportGovernanceScreen;
