import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/Ionicons';
import api from '../../services/api';
import { getErrorMessage, pickList } from '../../utils/http';

const STATUS_COLORS = {
  pending: '#1769E0',
  completed: '#169B62',
  scheduled: '#FFC928',
};

const AdminInspectionsScreen = ({ navigation }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadInspections = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/inspections');
      setItems(pickList(response, ['data', 'inspections']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load inspections'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInspections();
  }, []);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Icon name="search-outline" size={20} color="#0f172a" />
        <Text style={styles.title}>Inspections</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={loadInspections}
        renderItem={({ item }) => {
          const status = item.status || 'pending';
          const badgeColor = STATUS_COLORS[status] || '#1769E0';
          return (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.property_name || item.property_title || 'Property'}</Text>
              <Text style={styles.cardMeta}>Inspector: {item.inspector_name || item.inspector || 'N/A'}</Text>
              <Text style={styles.cardMeta}>Date: {item.inspection_date || item.date || 'N/A'}</Text>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: badgeColor }]}>
                  <Text style={styles.badgeText}>{status}</Text>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No inspections found.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 12, gap: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  list: { paddingHorizontal: 14, paddingBottom: 20 },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  cardMeta: { marginTop: 4, color: '#475569' },
  badgeRow: { flexDirection: 'row', marginTop: 8 },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: '#ffffff', fontWeight: '700', fontSize: 11, textTransform: 'capitalize' },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40 },
});

export default AdminInspectionsScreen;
