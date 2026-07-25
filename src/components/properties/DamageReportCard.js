import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import AppText from '../../components/common/AppText';
const DamageReportCard = ({ report, onPress, compact = false }) => {
  if (!report) return null;

  const severityColors = {
    low: '#059669',
    medium: '#d97706',
    high: '#dc2626',
    critical: '#7c3aed',
  };

  const severityColor = severityColors[report.severity?.toLowerCase()] || '#64748b';
  const photoUrl = report.photos?.[0]?.photo_url || report.photos?.[0] || null;

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactCard} onPress={onPress} activeOpacity={0.7}>
        <View style={[styles.severityDot, { backgroundColor: severityColor }]} />
        <View style={styles.compactContent}>
          <AppText style={styles.compactTitle} numberOfLines={1}>
            {report.damage_type || 'Damage Report'}
          </AppText>
          <AppText style={styles.compactMeta}>
            {report.room_location || 'N/A'} | Severity: {report.severity || 'N/A'}
          </AppText>
        </View>
        <Icon name="chevron-forward-outline" size={18} color="#94a3b8" />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {photoUrl && (
        <Image source={{ uri: photoUrl }} style={styles.image} />
      )}
      <View style={styles.content}>
        <View style={styles.header}>
          <AppText style={styles.title}>{report.damage_type || 'Damage Report'}</AppText>
          <View style={[styles.badge, { backgroundColor: severityColor + '20' }]}>
            <AppText style={[styles.badgeText, { color: severityColor }]}>
              {report.severity || 'N/A'}
            </AppText>
          </View>
        </View>
        <AppText style={styles.location}>Location: {report.room_location || 'N/A'}</AppText>
        {report.description && (
          <AppText style={styles.description} numberOfLines={3}>
            {report.description}
          </AppText>
        )}
        {report.ai_analysis?.repair_recommendation && (
          <View style={styles.recommendation}>
            <Icon name="bulb-outline" size={16} color="#1d4ed8" />
            <AppText style={styles.recommendationText} numberOfLines={2}>
              {report.ai_analysis.repair_recommendation}
            </AppText>
          </View>
        )}
        <View style={styles.footer}>
          <AppText style={styles.date}>
            {report.created_at ? new Date(report.created_at).toLocaleDateString() : ''}
          </AppText>
          <AppText style={styles.status}>{report.status || 'draft'}</AppText>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  severityDot: { width: 10, height: 10, borderRadius: 5 },
  compactContent: { flex: 1 },
  compactTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  compactMeta: { color: '#64748b', fontSize: 13, marginTop: 1 },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  image: { width: '100%', height: 180 },
  content: { padding: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: '#0f172a', flex: 1 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  badgeText: { fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
  location: { color: '#475569', fontSize: 13, marginTop: 4 },
  description: { color: '#334155', marginTop: 8, lineHeight: 20 },
  recommendation: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 10,
  },
  recommendationText: { color: '#1d4ed8', fontSize: 13, flex: 1 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  date: { color: '#64748b', fontSize: 13 },
  status: { color: '#64748b', fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
});

export default DamageReportCard;
