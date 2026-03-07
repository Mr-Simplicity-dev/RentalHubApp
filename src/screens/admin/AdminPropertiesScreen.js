import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import Toast from 'react-native-toast-message';
import { adminService } from '../../services/adminService';
import { getErrorMessage, pickList } from '../../utils/http';

const AdminPropertiesScreen = () => {
  const [items, setItems] = useState([]);

  const loadProperties = async () => {
    try {
      const response = await adminService.getProperties();
      setItems(pickList(response, ['data', 'properties']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load properties'),
      });
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Admin Properties</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardMeta}>{item.landlord_name || 'No landlord name'}</Text>
            <Text style={styles.cardMeta}>
              {[item.city, item.state].filter(Boolean).join(', ') || [item.city, item.state_name].filter(Boolean).join(', ')}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No properties found.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  title: { textAlign: 'center', marginVertical: 12, fontSize: 22, fontWeight: '800', color: '#0f172a' },
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
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40 },
});

export default AdminPropertiesScreen;
