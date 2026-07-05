import React, { useEffect, useLayoutEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { adminService } from '../../services/adminService';
import { getErrorMessage, pickObject } from '../../utils/http';
import TenancyWorkflowSection from '../../components/admin/TenancyWorkflowSection';
import PropertyRequestWorkflowSection from '../../components/admin/PropertyRequestWorkflowSection';
import { colors, radius, typography } from '../../theme';

const AdminDashboardScreen = ({ navigation }) => {
  const [stats, setStats] = useState({});

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadStats = async () => {
    try {
      const response = await adminService.getStats();
      setStats(pickObject(response, ['data']) || {});
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load admin dashboard'),
      });
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const cards = [
    { label: 'Users', value: stats.totalUsers ?? stats.total_tenants ?? '-', route: 'AdminUsers', icon: 'people-outline' },
    { label: 'Properties', value: stats.totalProperties ?? stats.total_properties ?? '-', route: 'AdminProperties', icon: 'business-outline' },
    { label: 'Applications', value: stats.applications ?? stats.total_applications ?? '-', route: 'AdminApplications', icon: 'documents-outline' },
    { label: 'Verifications', value: stats.pendingVerifications ?? stats.pending_verification ?? '-', route: 'AdminVerifications', icon: 'shield-checkmark-outline' },
  ];

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}><Icon name="settings-outline" size={24} color={colors.gold} /></View>
        <Text style={styles.heroEyebrow}>OPERATIONS</Text>
        <Text style={styles.title}>Administration hub</Text>
        <Text style={styles.heroText}>Monitor users, listings, verification and local workflows.</Text>
      </View>
      <View style={styles.grid}>
      {cards.map((card) => (
        <TouchableOpacity key={card.label} style={styles.card} onPress={() => navigation.navigate(card.route)}>
          <Icon name={card.icon} size={21} color={colors.blue} />
          <Text style={styles.cardTitle}>{card.label}</Text>
          <Text style={styles.cardValue}>{card.value}</Text>
        </TouchableOpacity>
      ))}
      </View>

      <TouchableOpacity style={styles.linkCard} onPress={() => navigation.navigate('AdminCompliance')}>
        <Icon name="shield-outline" size={21} color={colors.blue} />
        <View style={styles.linkCopy}>
        <Text style={styles.linkTitle}>Compliance & Risk</Text>
        <Text style={styles.linkMeta}>Open platform risk overview</Text>
        </View><Icon name="chevron-forward" size={18} color={colors.muted} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkCard} onPress={() => navigation.navigate('AdminAgentAssignments')}>
        <Icon name="people-circle-outline" size={21} color={colors.blue} />
        <View style={styles.linkCopy}>
        <Text style={styles.linkTitle}>Agent Assignments</Text>
        <Text style={styles.linkMeta}>Assign, deactivate, and reassign landlord agents</Text>
        </View><Icon name="chevron-forward" size={18} color={colors.muted} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkCard} onPress={() => navigation.navigate('RecruitmentAdmin')}>
        <Icon name="briefcase-outline" size={21} color={colors.blue} />
        <View style={styles.linkCopy}>
        <Text style={styles.linkTitle}>Recruitment Admin</Text>
        <Text style={styles.linkMeta}>Open cycles, roles, applicant reviews, and exports</Text>
        </View><Icon name="chevron-forward" size={18} color={colors.muted} />
      </TouchableOpacity>

      <PropertyRequestWorkflowSection mode="state" title="Tenant Property Requests" />
      <TenancyWorkflowSection title="LGA Tenancy Grace and Refund Enablement" />
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 18, paddingBottom: 30 },
  hero: { backgroundColor: colors.navy, borderRadius: radius.lg, marginBottom: 13, padding: 20 },
  heroIcon: { alignItems: 'center', backgroundColor: 'rgba(255,201,40,0.14)', borderRadius: 21, height: 42, justifyContent: 'center', width: 42 },
  heroEyebrow: { color: '#9BC3F4', fontFamily: typography.bold, fontSize: 9, letterSpacing: 1.2, marginTop: 15 },
  title: { fontSize: 25, fontFamily: typography.bold, color: colors.white, marginTop: 4 },
  heroText: { color: '#AFC2DF', fontFamily: typography.regular, fontSize: 12, marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 9 },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    width: '48%',
  },
  cardTitle: { color: colors.muted, fontFamily: typography.medium, fontSize: 10, marginTop: 10 },
  cardValue: { marginTop: 4, fontSize: 24, fontFamily: typography.bold, color: colors.ink },
  linkCard: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 8,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkCopy: { flex: 1, marginLeft: 11 },
  linkTitle: { color: colors.ink, fontSize: 14, fontFamily: typography.bold },
  linkMeta: { color: colors.muted, marginTop: 3, fontFamily: typography.regular, fontSize: 10 },
});

export default AdminDashboardScreen;
