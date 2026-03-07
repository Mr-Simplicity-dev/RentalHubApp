import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Toast from 'react-native-toast-message';
import { complianceService } from '../../services/complianceService';
import { getErrorMessage, pickList, pickObject } from '../../utils/http';

const AdminComplianceScreen = () => {
  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState([]);

  const loadCompliance = async () => {
    try {
      const [overviewResponse, trendResponse] = await Promise.all([
        complianceService.getOverview(),
        complianceService.getRiskTrend(),
      ]);
      setOverview(pickObject(overviewResponse, ['data']));
      setTrend(pickList(trendResponse, ['data']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load compliance data'),
      });
    }
  };

  useEffect(() => {
    loadCompliance();
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Compliance & Risk</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <Text style={styles.meta}>Open Disputes: {overview?.totalOpen ?? '-'}</Text>
        <Text style={styles.meta}>Escalated: {overview?.escalated ?? '-'}</Text>
        <Text style={styles.meta}>Aging Cases: {overview?.aging ?? '-'}</Text>
        <Text style={styles.meta}>No Evidence: {overview?.withoutEvidence ?? '-'}</Text>
        <Text style={styles.meta}>Lawyer Activity: {overview?.lawyerActivity ?? '-'}</Text>
        <Text style={styles.meta}>Risk Score: {overview?.riskScore ?? '-'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Risk Trend</Text>
        {trend.length === 0 ? (
          <Text style={styles.meta}>No trend data available.</Text>
        ) : (
          trend.map((item, index) => (
            <Text key={`${item.day}-${index}`} style={styles.meta}>
              {item.day || `Day ${index + 1}`}: {item.risk_score ?? item.riskScore ?? '-'}
            </Text>
          ))
        )}
      </View>
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
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  meta: { color: '#475569', marginBottom: 6 },
});

export default AdminComplianceScreen;
