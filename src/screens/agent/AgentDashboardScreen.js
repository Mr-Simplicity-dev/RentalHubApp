import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { agentService } from '../../services/agentService';
import { getErrorMessage, pickObject } from '../../utils/http';
import { colors, radius, typography } from '../../theme';

const ActionCard = ({ title, subtitle, onPress, icon }) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <View style={styles.actionIcon}><Icon name={icon} size={21} color={colors.blue} /></View>
    <View style={styles.actionCopy}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardText}>{subtitle}</Text>
    </View>
    <Icon name="chevron-forward" size={18} color={colors.muted} />
  </TouchableOpacity>
);

const AgentDashboardScreen = ({ navigation }) => {
  const [profile, setProfile] = useState(null);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

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
    <SafeAreaView edges={['top']} style={styles.safeArea}>
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}><Icon name="briefcase-outline" size={24} color={colors.gold} /></View>
        <Text style={styles.heroEyebrow}>AGENT WORKSPACE</Text>
        <Text style={styles.title}>Your operations hub</Text>
        <Text style={styles.subtitle}>Manage delegated properties, commissions and payouts.</Text>
      </View>

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
          icon="business-outline"
          onPress={() => navigation.navigate('MyProperties')}
        />
        <ActionCard
          title="Add Property"
          subtitle="Publish a new listing"
          icon="add-circle-outline"
          onPress={() => navigation.navigate('AddProperty')}
        />
        <ActionCard
          title="Messages & Disputes"
          subtitle="Handle routine coordination tasks"
          icon="chatbubbles-outline"
          onPress={() => navigation.navigate('Messages')}
        />
        <ActionCard
          title="Commission Ledger"
          subtitle="View earnings and transaction history"
          icon="trending-up-outline"
          onPress={() => navigation.navigate('AgentEarnings')}
        />
        <ActionCard
          title="Withdrawal Requests"
          subtitle="Request payout from earned commissions"
          icon="wallet-outline"
          onPress={() => navigation.navigate('AgentWithdrawals')}
        />
      </View>
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 18, paddingBottom: 30 },
  hero: { backgroundColor: colors.navy, borderRadius: radius.lg, marginBottom: 14, padding: 20 },
  heroIcon: { alignItems: 'center', backgroundColor: 'rgba(255,201,40,0.14)', borderRadius: 21, height: 42, justifyContent: 'center', width: 42 },
  heroEyebrow: { color: '#9BC3F4', fontFamily: typography.bold, fontSize: 9, letterSpacing: 1.2, marginTop: 15 },
  title: { fontSize: 25, fontFamily: typography.bold, color: colors.white, marginTop: 4 },
  subtitle: { marginTop: 6, color: '#AFC2DF', fontFamily: typography.regular, fontSize: 12, lineHeight: 18 },
  infoCard: {
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: radius.md,
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
  warningTitle: { color: '#92400e', fontFamily: typography.bold },
  warningText: { color: '#b45309', fontFamily: typography.regular, marginTop: 6 },
  infoTitle: { color: colors.blue, fontFamily: typography.bold },
  infoText: { marginTop: 6, fontFamily: typography.semibold, color: colors.ink },
  infoMeta: { marginTop: 4, color: colors.text, fontFamily: typography.regular },
  grid: { gap: 10 },
  card: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.white,
    flexDirection: 'row',
    padding: 13,
  },
  actionIcon: { alignItems: 'center', backgroundColor: colors.surfaceBlue, borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  actionCopy: { flex: 1, marginLeft: 11 },
  cardTitle: { color: colors.ink, fontFamily: typography.bold, fontSize: 14 },
  cardText: { marginTop: 3, color: colors.muted, fontFamily: typography.regular, fontSize: 10 },
});

export default AgentDashboardScreen;
