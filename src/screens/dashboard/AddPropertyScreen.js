import React, { useState } from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { propertyService } from '../../services/propertyService';
import { getErrorMessage } from '../../utils/http';

const AddPropertyScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    state: '',
    city: '',
    area: '',
    property_type: 'apartment',
    bedrooms: '1',
    bathrooms: '1',
    rent_amount: '',
    payment_frequency: 'yearly',
  });

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.title || !form.state || !form.city || !form.rent_amount) {
      Toast.show({ type: 'error', text1: 'Complete required fields' });
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        bedrooms: Number(form.bedrooms || 0),
        bathrooms: Number(form.bathrooms || 0),
        rent_amount: Number(form.rent_amount || 0),
      };
      const response = await propertyService.createProperty(payload);
      if (response.success) {
        Toast.show({ type: 'success', text1: 'Property created' });
        navigation.navigate('MyProperties');
      } else {
        Toast.show({
          type: 'error',
          text1: 'Creation failed',
          text2: response.message || 'Could not create property',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Creation failed',
        text2: getErrorMessage(error, 'Could not create property'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Add Property</Text>

      <Input label="Title" value={form.title} onChangeText={(value) => onChange('title', value)} />
      <Input
        label="Description"
        value={form.description}
        onChangeText={(value) => onChange('description', value)}
        multiline
        numberOfLines={4}
      />
      <Input label="State" value={form.state} onChangeText={(value) => onChange('state', value)} />
      <Input label="City" value={form.city} onChangeText={(value) => onChange('city', value)} />
      <Input label="Area" value={form.area} onChangeText={(value) => onChange('area', value)} />
      <Input
        label="Property Type"
        value={form.property_type}
        onChangeText={(value) => onChange('property_type', value)}
      />
      <Input
        label="Bedrooms"
        value={form.bedrooms}
        onChangeText={(value) => onChange('bedrooms', value)}
        keyboardType="number-pad"
      />
      <Input
        label="Bathrooms"
        value={form.bathrooms}
        onChangeText={(value) => onChange('bathrooms', value)}
        keyboardType="number-pad"
      />
      <Input
        label="Rent Amount"
        value={form.rent_amount}
        onChangeText={(value) => onChange('rent_amount', value)}
        keyboardType="number-pad"
      />
      <Input
        label="Payment Frequency"
        value={form.payment_frequency}
        onChangeText={(value) => onChange('payment_frequency', value)}
        placeholder="monthly or yearly"
      />

      <Button title="Publish Property" onPress={handleSubmit} loading={loading} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  content: { padding: 16, paddingBottom: 24 },
  title: { fontSize: 26, fontWeight: '800', color: '#0f172a', marginBottom: 14 },
});

export default AddPropertyScreen;
