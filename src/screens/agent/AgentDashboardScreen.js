import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { agentService } from '../../services/agentService';
import { getErrorMessage, pickObject } from '../../utils/http';

const ActionCard = ({ title, subtitle, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <Text style={styles.cardTitle}>{title}</Text>
    <Text style={styles.cardText}>{subtitle}</Text>
  </TouchableOpacity>
);

const AgentDashboardScreen = ({ navigation }) => {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await agentService.getProfile();
        setProfile(pickObject(response, ['data']) || null);
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Failed',
          text2: getErrorMessage(error, 'Could not load agent profile'),
        });
      }
    };

    loadProfile();
  }, []);

  const assignment = profile?.agent_assignment;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Agent Dashboard</Text>
      <Text style={styles.subtitle}>Handle delegated landlord operations</Text>

      {!assignment ? (
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>No active assignment yet</Text>
          <Text style={styles.warningText}>
            Your account is active but not yet linked to a landlord profile.
          </Text>
        </View>
      ) : (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Assigned Landlord</Text>
          <Text style={styles.infoText}>{assignment.landlord_name || 'N/A'}</Text>
          <Text style={styles.infoMeta}>{assignment.landlord_email || 'No email'}</Text>
          <Text style={styles.infoMeta}>{assignment.landlord_phone || 'No phone'}</Text>
        </View>
      )}

      <View style={styles.grid}>
        <ActionCard
          title="Manage Properties"
          subtitle="Create and update landlord listings"
          onPress={() => navigation.navigate('MyProperties')}
        />
        <ActionCard
          title="Add Property"
          subtitle="Publish a new listing"
          onPress={() => navigation.navigate('AddProperty')}
        />
        <ActionCard
          title="Messages & Disputes"
          subtitle="Handle routine coordination tasks"
          onPress={() => navigation.navigate('Messages')}
        />
        <ActionCard
          title="Commission Ledger"
          subtitle="View earnings and transaction history"
          onPress={() => navigation.navigate('AgentEarnings')}
        />
        <ActionCard
          title="Withdrawal Requests"
          subtitle="Request payout from earned commissions"
          onPress={() => navigation.navigate('AgentWithdrawals')}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a' },
  subtitle: { marginTop: 6, marginBottom: 14, color: '#64748b' },
  infoCard: {
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    padding: 12,
    marginBottom: 14,
  },
  warningCard: {
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    backgroundColor: '#fffbeb',
    padding: 12,
    marginBottom: 14,
  },
  warningTitle: { color: '#92400e', fontWeight: '800' },
  warningText: { color: '#b45309', marginTop: 6 },
  infoTitle: { color: '#1d4ed8', fontWeight: '800' },
  infoText: { marginTop: 6, fontWeight: '700', color: '#0f172a' },
  infoMeta: { marginTop: 4, color: '#334155' },
  grid: { gap: 10 },
  card: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    padding: 12,
  },
  cardTitle: { color: '#0f172a', fontWeight: '800' },
  cardText: { marginTop: 4, color: '#64748b' },
});

export default AgentDashboardScreen;
