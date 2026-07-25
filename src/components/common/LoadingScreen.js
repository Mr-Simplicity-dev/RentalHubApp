import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

import AppText from '../../components/common/AppText';
const LoadingScreen = ({ message = 'Loading...' }) => (
  <View style={styles.container}>
    <ActivityIndicator size="large" color="#0284c7" />
    <AppText style={styles.text}>{message}</AppText>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    gap: 12,
  },
  text: { color: '#64748b', fontSize: 16, fontWeight: '500' },
});

export default LoadingScreen;
