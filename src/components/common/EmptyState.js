import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const EmptyState = ({
  icon = 'file-tray-outline',
  title = 'Nothing here yet',
  message = '',
  action,
}) => (
  <View style={styles.container}>
    <Icon name={icon} size={56} color="#cbd5e1" />
    <Text style={styles.title}>{title}</Text>
    {message ? <Text style={styles.message}>{message}</Text> : null}
    {action}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 8,
  },
  title: { fontSize: 17, fontWeight: '700', color: '#64748b', textAlign: 'center' },
  message: { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
});

export default EmptyState;
