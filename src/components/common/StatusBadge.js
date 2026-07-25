import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const statusColorMap = {
  active: { bg: '#dcfce7', text: '#166534' },
  pending: { bg: '#fef3c7', text: '#92400e' },
  approved: { bg: '#dcfce7', text: '#166534' },
  rejected: { bg: '#fee2e2', text: '#991b1b' },
  completed: { bg: '#dcfce7', text: '#166534' },
  failed: { bg: '#fee2e2', text: '#991b1b' },
  cancelled: { bg: '#f1f5f9', text: '#475569' },
  draft: { bg: '#f1f5f9', text: '#475569' },
  verified: { bg: '#dcfce7', text: '#166534' },
  unverified: { bg: '#fef3c7', text: '#92400e' },
  paid: { bg: '#dcfce7', text: '#166534' },
  unpaid: { bg: '#fef3c7', text: '#92400e' },
  in_progress: { bg: '#dbeafe', text: '#1e40af' },
  default: { bg: '#f1f5f9', text: '#475569' },
};

const StatusBadge = ({ status, style, textStyle }) => {
  const normalized = (status || '').toLowerCase().replace(/\s+/g, '_');
  const colors = statusColorMap[normalized] || statusColorMap.default;

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }, style]}>
      <Text style={[styles.text, { color: colors.text }, textStyle]}>
        {status || 'Unknown'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
});

export default StatusBadge;
