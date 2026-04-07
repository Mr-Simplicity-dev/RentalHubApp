import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import Button from '../../components/common/Button';
import { AuthContext } from '../../context/AuthContext';
import { propertyService } from '../../services/propertyService';
import { getErrorMessage, pickList } from '../../utils/http';

const MyPropertiesScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const loadProperties = async () => {
    setLoading(true);
    try {
      const response = await propertyService.getMyProperties();
      setItems(pickList(response, ['data', 'properties']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load your properties'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  const toggleAvailability = async (id) => {
    try {
      await propertyService.toggleAvailability(id);
      await loadProperties();
      Toast.show({ type: 'success', text1: 'Availability updated' });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not update availability'),
      });
    }
  };

  const unlistProperty = async (id) => {
    try {
      await propertyService.unlistProperty(id);
      await loadProperties();
      Toast.show({ type: 'success', text1: 'Property unlisted' });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not unlist property'),
      });
    }
  };

  if (!['landlord', 'agent'].includes(user?.user_type)) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Only landlords or assigned agents can access this section.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>My Properties</Text>
        <Button title="Add Property" size="sm" onPress={() => navigation.navigate('AddProperty')} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardMeta}>
              {[item.city, item.state_name].filter(Boolean).join(', ')} | NGN {Number(item.rent_amount || 0).toLocaleString()}
            </Text>
            <Text style={styles.cardMeta}>
              Status: {item.is_verified ? (item.is_available ? 'available' : 'unavailable') : 'pending verification'}
            </Text>

            <View style={styles.actions}>
              <TouchableOpacity onPress={() => toggleAvailability(item.id)} style={styles.linkBtn}>
                <Text style={styles.linkText}>Toggle Availability</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => unlistProperty(item.id)} style={styles.linkBtn}>
                <Text style={[styles.linkText, styles.warn]}>Unlist</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>You have not listed any property yet.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
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
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  linkBtn: { paddingVertical: 4 },
  linkText: { color: '#0284c7', fontWeight: '700' },
  warn: { color: '#dc2626' },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40 },
});

export default MyPropertiesScreen;
