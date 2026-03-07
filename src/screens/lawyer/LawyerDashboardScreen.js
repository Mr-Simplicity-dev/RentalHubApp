import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import Toast from 'react-native-toast-message';
import { legalService } from '../../services/legalService';
import { getErrorMessage, pickList } from '../../utils/http';

const LawyerDashboardScreen = ({ navigation }) => {
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadProperties = async () => {
    setLoading(true);
    try {
      const response = await legalService.getAuthorizedProperties();
      setProperties(pickList(response, ['data', 'properties']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load lawyer properties'),
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDisputes = async (property) => {
    setSelectedProperty(property);
    try {
      const response = await legalService.getPropertyDisputes(property.id);
      setDisputes(pickList(response, ['data', 'disputes']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load disputes'),
      });
    }
  };

  const resolveDispute = async (id) => {
    try {
      await legalService.resolveDispute(id);
      if (selectedProperty) {
        await loadDisputes(selectedProperty);
      }
      Toast.show({ type: 'success', text1: 'Dispute resolved' });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not resolve dispute'),
      });
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Lawyer Dashboard</Text>
        <TouchableOpacity onPress={() => navigation.navigate('VerifyCase')}>
          <Text style={styles.linkText}>Verify Evidence</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Authorized Properties</Text>
      {loading ? (
        <Text style={styles.empty}>Loading...</Text>
      ) : (
        <FlatList
          data={properties}
          scrollEnabled={false}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.card,
                selectedProperty?.id === item.id && styles.cardActive,
              ]}
              onPress={() => loadDisputes(item)}
            >
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardMeta}>{[item.city, item.state_name].filter(Boolean).join(', ')}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No authorized properties.</Text>}
        />
      )}

      {selectedProperty ? (
        <>
          <Text style={styles.sectionTitle}>Disputes for {selectedProperty.title}</Text>
          {disputes.length === 0 ? (
            <Text style={styles.empty}>No disputes found.</Text>
          ) : (
            disputes.map((item) => (
              <View key={item.id} style={styles.card}>
                <Text style={styles.cardTitle}>Dispute #{item.id}</Text>
                <Text style={styles.cardMeta}>Status: {item.status || 'open'}</Text>
                <Text style={styles.cardText}>{item.description || 'No description available'}</Text>
                <View style={styles.row}>
                  <TouchableOpacity onPress={() => navigation.navigate('VerifyCase', { disputeId: item.id })}>
                    <Text style={styles.linkText}>Verify Integrity</Text>
                  </TouchableOpacity>
                  {item.status !== 'resolved' && (
                    <TouchableOpacity onPress={() => resolveDispute(item.id)}>
                      <Text style={styles.linkWarn}>Resolve</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: '#0f172a' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginTop: 16, marginBottom: 8 },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  cardActive: { borderColor: '#60a5fa', backgroundColor: '#eff6ff' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  cardMeta: { marginTop: 4, color: '#475569' },
  cardText: { marginTop: 8, color: '#334155' },
  row: { flexDirection: 'row', gap: 16, marginTop: 10 },
  linkText: { color: '#0284c7', fontWeight: '700' },
  linkWarn: { color: '#dc2626', fontWeight: '700' },
  empty: { color: '#64748b' },
});

export default LawyerDashboardScreen;
