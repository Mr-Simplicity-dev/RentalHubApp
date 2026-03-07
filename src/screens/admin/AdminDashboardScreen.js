import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Toast from 'react-native-toast-message';
import { adminService } from '../../services/adminService';
import { getErrorMessage, pickObject } from '../../utils/http';

const AdminDashboardScreen = ({ navigation }) => {
  const [stats, setStats] = useState({});

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
    { label: 'Users', value: stats.totalUsers ?? stats.total_tenants ?? '-', route: 'AdminUsers' },
    { label: 'Properties', value: stats.totalProperties ?? stats.total_properties ?? '-', route: 'AdminProperties' },
    { label: 'Applications', value: stats.applications ?? stats.total_applications ?? '-', route: 'AdminApplications' },
    { label: 'Verifications', value: stats.pendingVerifications ?? stats.pending_verification ?? '-', route: 'AdminVerifications' },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Admin Dashboard</Text>
      {cards.map((card) => (
        <TouchableOpacity key={card.label} style={styles.card} onPress={() => navigation.navigate(card.route)}>
          <Text style={styles.cardTitle}>{card.label}</Text>
          <Text style={styles.cardValue}>{card.value}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.linkCard} onPress={() => navigation.navigate('AdminCompliance')}>
        <Text style={styles.linkTitle}>Compliance & Risk</Text>
        <Text style={styles.linkMeta}>Open platform risk overview</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 14 },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  cardTitle: { color: '#64748b', fontSize: 13 },
  cardValue: { marginTop: 6, fontSize: 28, fontWeight: '800', color: '#0f172a' },
  linkCard: {
    marginTop: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  linkTitle: { color: '#1d4ed8', fontSize: 16, fontWeight: '700' },
  linkMeta: { color: '#1e3a8a', marginTop: 4 },
});

export default AdminDashboardScreen;
