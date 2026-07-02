import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import recruitmentService from '../../services/recruitmentService';
import { getErrorMessage } from '../../utils/http';

const RecruitmentAdminScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [roles, setRoles] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [statusRes, rolesRes, cyclesRes] = await Promise.all([
          recruitmentService.getStatus(),
          recruitmentService.getActiveRoles(),
          recruitmentService.getActiveCycles(),
        ]);
        setStatus(statusRes?.data?.data || statusRes?.data || null);
        setRoles(rolesRes?.data?.data || []);
        setCycles(cyclesRes?.data?.data || []);
      } catch (err) {
        setError(getErrorMessage(err, 'Could not load recruitment admin overview'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.centerText}>Loading recruitment admin view...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Recruitment Admin</Text>
      <Text style={styles.subtitle}>Review recruitment status and open the full admin console from your phone.</Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{status?.is_active ? 'Recruitment is open' : 'Recruitment is closed'}</Text>
        <Text style={styles.cardText}>{status?.message || 'Monitor cycles, roles, and applicants from the full console.'}</Text>
      </View>

      <View style={styles.metricRow}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Active cycles</Text>
          <Text style={styles.metricValue}>{cycles.length}</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Active roles</Text>
          <Text style={styles.metricValue}>{roles.length}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('WebRoute', { path: '/admin/recruitment', title: 'Recruitment Admin' })}
      >
        <Text style={styles.buttonText}>Open full recruitment console</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  centerText: { marginTop: 8, color: '#64748b' },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a' },
  subtitle: { color: '#64748b', marginTop: 6, marginBottom: 12 },
  card: { backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12 },
  cardTitle: { color: '#0f172a', fontSize: 16, fontWeight: '700' },
  cardText: { color: '#64748b', marginTop: 4 },
  metricRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  metricBox: { flex: 1, backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1, borderRadius: 12, padding: 12 },
  metricLabel: { color: '#1d4ed8', fontSize: 12, fontWeight: '600' },
  metricValue: { color: '#0f172a', fontSize: 24, fontWeight: '800', marginTop: 4 },
  button: { backgroundColor: '#0284c7', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  buttonText: { color: '#ffffff', fontWeight: '700' },
  errorText: { color: '#dc2626', marginBottom: 10, fontWeight: '600' },
});

export default RecruitmentAdminScreen;
