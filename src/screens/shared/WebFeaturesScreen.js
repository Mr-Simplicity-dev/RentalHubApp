import React, { useContext, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AuthContext } from '../../context/AuthContext';

const makePublicFeatures = () => [
  { label: 'Home', path: '/' },
  { label: 'Lawyers Directory', path: '/lawyers' },
  { label: 'Properties', path: '/properties' },
  { label: 'Verify Email', path: '/verify-email' },
  { label: 'Verify Phone', path: '/verify-phone' },
  { label: 'Forgot Password', path: '/forgot-password' },
  { label: 'FAQ', path: '/faq' },
  { label: 'How It Works', path: '/how-it-works' },
  { label: 'Pricing', path: '/pricing' },
  { label: 'Landlord Guide', path: '/landlord-guide' },
  { label: 'Privacy', path: '/privacy' },
  { label: 'Terms', path: '/terms' },
  { label: 'Nigeria Page', path: '/nigeria' },
  { label: 'Super Admin Landing', path: '/super-admin' },
];

const makeProtectedFeatures = (userType) => {
  const base = [
    { label: 'Profile', path: '/profile' },
    { label: 'Payment History', path: '/payment-history' },
    { label: 'Saved Properties (Web)', path: '/saved-properties' },
    { label: 'Applications (Web)', path: '/applications' },
    { label: 'Messages (Web)', path: '/messages' },
    { label: 'Subscribe', path: '/subscribe' },
    { label: 'Dashboard', path: '/dashboard' },
  ];

  if (userType === 'admin') {
    return [
      ...base,
      { label: 'Admin Dashboard', path: '/admin' },
      { label: 'Admin Lawyer Invites', path: '/admin/lawyer-invites' },
      { label: 'Admin Users', path: '/admin/users' },
      { label: 'Admin Properties', path: '/admin/properties' },
      { label: 'Admin Applications', path: '/admin/applications' },
      { label: 'Admin Verifications', path: '/admin/verifications' },
      { label: 'Admin Compliance', path: '/admin/compliance' },
      { label: 'Admin Agent Management', path: '/admin/agents' },
      { label: 'Admin Financial Dashboard', path: '/admin/financial-dashboard' },
      { label: 'Admin State Dashboard', path: '/admin/state-dashboard' },
    ];
  }

  if (userType === 'financial_admin') {
    return [
      ...base,
      { label: 'Financial Dashboard', path: '/admin/financial-dashboard' },
      { label: 'Admin Dashboard', path: '/admin' },
    ];
  }

  if (userType === 'state_admin') {
    return [
      ...base,
      { label: 'State Dashboard', path: '/admin/state-dashboard' },
      { label: 'Admin Dashboard', path: '/admin' },
    ];
  }

  if (userType === 'super_admin') {
    return [
      ...base,
      { label: 'Super Admin Dashboard', path: '/super-admin' },
      { label: 'Admin Dashboard', path: '/admin' },
      { label: 'Admin Users', path: '/admin/users' },
      { label: 'Admin Properties', path: '/admin/properties' },
      { label: 'Admin Applications', path: '/admin/applications' },
      { label: 'Admin Verifications', path: '/admin/verifications' },
      { label: 'Admin Compliance', path: '/admin/compliance' },
      { label: 'Admin Agent Management', path: '/admin/agents' },
    ];
  }

  if (userType === 'agent') {
    return [
      ...base,
      { label: 'Agent Dashboard (Web)', path: '/agent/dashboard' },
      { label: 'Agent Earnings (Web)', path: '/agent/earnings' },
      { label: 'Agent Withdrawals (Web)', path: '/agent/withdrawals' },
      { label: 'My Properties', path: '/my-properties' },
      { label: 'Add Property', path: '/add-property' },
    ];
  }

  if (userType === 'lawyer') {
    return [
      ...base,
      { label: 'Lawyer Dashboard', path: '/lawyer' },
      { label: 'Case Verification', path: '/verify-case' },
    ];
  }

  if (userType === 'landlord') {
    return [
      ...base,
      { label: 'Landlord Dashboard', path: '/dashboard' },
      { label: 'My Properties', path: '/my-properties' },
      { label: 'Add Property', path: '/add-property' },
    ];
  }

  if (userType === 'tenant') {
    return [...base, { label: 'Tenant Dashboard', path: '/tenant/dashboard' }];
  }

  return base;
};

const WebFeaturesScreen = ({ navigation }) => {
  const { user, isAuthenticated } = useContext(AuthContext);

  const publicFeatures = useMemo(() => makePublicFeatures(), []);
  const protectedFeatures = useMemo(
    () => makeProtectedFeatures(user?.user_type),
    [user?.user_type]
  );

  const openPath = (path, title) => {
    navigation.navigate('WebRoute', { path, title });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Web Feature Access</Text>
      <Text style={styles.subtitle}>
        Every web module is accessible from mobile. Native screens are used where available.
      </Text>

      <Text style={styles.section}>Public Features</Text>
      {publicFeatures.map((item) => (
        <TouchableOpacity
          key={`public-${item.path}`}
          style={styles.card}
          onPress={() => openPath(item.path, item.label)}
        >
          <Text style={styles.cardTitle}>{item.label}</Text>
          <Text style={styles.cardPath}>{item.path}</Text>
        </TouchableOpacity>
      ))}

      {isAuthenticated ? (
        <>
          <Text style={styles.section}>Account Features</Text>
          {protectedFeatures.map((item) => (
            <TouchableOpacity
              key={`protected-${item.path}`}
              style={styles.card}
              onPress={() => openPath(item.path, item.label)}
            >
              <Text style={styles.cardTitle}>{item.label}</Text>
              <Text style={styles.cardPath}>{item.path}</Text>
            </TouchableOpacity>
          ))}
        </>
      ) : null}

      <View style={styles.noteBox}>
        <Text style={styles.noteTitle}>Note</Text>
        <Text style={styles.noteText}>
          For modules already implemented natively, use the in-app screens for the best experience.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 24 },
  title: { fontSize: 26, fontWeight: '800', color: '#0f172a' },
  subtitle: { color: '#64748b', marginTop: 6, marginBottom: 12 },
  section: { marginTop: 12, marginBottom: 8, color: '#0f172a', fontSize: 16, fontWeight: '700' },
  card: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 8,
  },
  cardTitle: { color: '#0f172a', fontWeight: '700' },
  cardPath: { color: '#64748b', marginTop: 4 },
  noteBox: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 12,
  },
  noteTitle: { color: '#1d4ed8', fontWeight: '700' },
  noteText: { color: '#1e3a8a', marginTop: 4 },
});

export default WebFeaturesScreen;
