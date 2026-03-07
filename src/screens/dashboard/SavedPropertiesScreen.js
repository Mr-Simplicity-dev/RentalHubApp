import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import PropertyCard from '../../components/properties/PropertyCard';
import { propertyService } from '../../services/propertyService';
import { getErrorMessage, pickList } from '../../utils/http';

const SavedPropertiesScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const loadSaved = async () => {
    setLoading(true);
    try {
      const response = await propertyService.getSavedProperties();
      setItems(pickList(response, ['data', 'properties']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load saved properties'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSaved();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Saved Properties</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <PropertyCard
            property={item}
            onPress={() => navigation.navigate('PropertyDetail', { id: item.id })}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No saved properties yet.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginVertical: 12,
  },
  list: { paddingHorizontal: 14, paddingBottom: 20 },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 40 },
});

export default SavedPropertiesScreen;
