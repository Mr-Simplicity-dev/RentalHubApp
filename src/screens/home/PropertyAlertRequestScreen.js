import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import SelectField from '../../components/common/SelectField';
import OptionPickerModal from '../../components/common/OptionPickerModal';
import { propertyService } from '../../services/propertyService';
import { getErrorMessage, pickList, pickObject } from '../../utils/http';

const propertyTypes = [
  { label: 'Apartment', value: 'apartment' },
  { label: 'House', value: 'house' },
  { label: 'Duplex', value: 'duplex' },
  { label: 'Studio', value: 'studio' },
  { label: 'Bungalow', value: 'bungalow' },
  { label: 'Flat', value: 'flat' },
  { label: 'Room', value: 'room' },
];

const defaultPricing = {
  amount: 5000,
  base_amount: 5000,
  location_required: false,
  location_complete: false,
  rule_scope: 'base',
};

const PropertyAlertRequestScreen = ({ route, navigation }) => {
  const paymentReference =
    route?.params?.alert_ref ||
    route?.params?.reference ||
    route?.params?.trxref ||
    '';
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [locationOptions, setLocationOptions] = useState([]);
  const [config, setConfig] = useState({
    payment_required: false,
    ...defaultPricing,
  });
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showLgaPicker, setShowLgaPicker] = useState(false);
  const [paymentState, setPaymentState] = useState({
    reference: paymentReference,
    authorizationUrl: '',
  });
  const [form, setForm] = useState({
    full_name: route?.params?.full_name || '',
    email: route?.params?.email || '',
    phone: '',
    property_type: route?.params?.property_type || '',
    state_id: route?.params?.state_id ? String(route.params.state_id) : '',
    lga_name: route?.params?.lga_name || '',
    city: route?.params?.city || '',
    min_price: '',
    max_price: '',
    bedrooms: '',
    bathrooms: '',
  });

  const selectedType = propertyTypes.find((item) => item.value === form.property_type);
  const selectedState = useMemo(
    () => locationOptions.find((item) => String(item.id) === String(form.state_id)),
    [form.state_id, locationOptions]
  );
  const availableLgas = selectedState?.lgas || [];

  const loadLocationOptions = async () => {
    try {
      const response = await propertyService.getLocationOptions();
      setLocationOptions(pickList(response, ['data']));
    } catch (error) {
      setLocationOptions([]);
    }
  };

  const loadAlertConfig = async () => {
    try {
      const response = await propertyService.getPropertyAlertConfig({
        state_id: form.state_id || undefined,
        lga_name: form.lga_name || undefined,
      });
      const responseData = pickObject(response, ['data']) || {};
      setConfig({
        payment_required: responseData.payment_required === true,
        amount: responseData.amount || 5000,
        base_amount: responseData.base_amount || 5000,
        location_required: responseData.location_required === true,
        location_complete: responseData.location_complete === true,
        rule_scope: responseData.rule_scope || 'base',
      });
    } catch (error) {
      setConfig({
        payment_required: false,
        ...defaultPricing,
      });
    }
  };

  useEffect(() => {
    loadLocationOptions();
  }, []);

  useEffect(() => {
    loadAlertConfig();
  }, [form.state_id, form.lga_name]);

  useEffect(() => {
    if (paymentReference) {
      completePaidRequest(paymentReference);
    }
  }, [paymentReference]);

  const onChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'state_id' ? { lga_name: '' } : {}),
    }));
  };

  const validate = () => {
    if (!form.full_name.trim() || !form.email.trim() || !form.property_type) {
      return 'Name, email and property type are required.';
    }

    if (config.payment_required && !form.state_id) {
      return 'Select your preferred state to calculate the request fee.';
    }

    if (config.payment_required && !form.lga_name.trim()) {
      return 'Select your preferred local government area to calculate the request fee.';
    }

    return null;
  };

  const buildPayload = () => ({
    full_name: form.full_name.trim(),
    email: form.email.trim().toLowerCase(),
    phone: form.phone.trim() || undefined,
    property_type: form.property_type,
    state_id: form.state_id ? Number(form.state_id) : undefined,
    lga_name: form.lga_name.trim() || undefined,
    city: form.city.trim() || undefined,
    min_price: form.min_price || undefined,
    max_price: form.max_price || undefined,
    bedrooms: form.bedrooms || undefined,
    bathrooms: form.bathrooms || undefined,
  });

  const submitRequest = async () => {
    const validationError = validate();
    if (validationError) {
      Toast.show({
        type: 'error',
        text1: 'Request failed',
        text2: validationError,
      });
      return;
    }

    setLoading(true);
    try {
      const response = await propertyService.requestPropertyAlert(buildPayload());
      const responseData = pickObject(response, ['data']) || {};

      if (responseData.authorization_url && responseData.reference) {
        setPaymentState({
          reference: responseData.reference,
          authorizationUrl: responseData.authorization_url,
        });
        await Linking.openURL(responseData.authorization_url);
        Toast.show({
          type: 'success',
          text1: 'Payment started',
          text2: 'Complete payment in browser, then return here and finish the request.',
        });
        return;
      }

      if (response.success) {
        Toast.show({
          type: 'success',
          text1: 'Request submitted',
          text2:
            response.message ||
            'We will notify you when a matching property is available.',
        });
        navigation.goBack();
      } else {
        throw new Error(response.message || 'Request failed');
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Request failed',
        text2: getErrorMessage(error, 'Could not submit notification request'),
      });
    } finally {
      setLoading(false);
    }
  };

  const completePaidRequest = async (reference = paymentState.reference) => {
    if (!reference) return;

    setPaymentLoading(true);
    try {
      const response = await propertyService.completePropertyAlertRequest(reference);
      if (!response.success) {
        throw new Error(response.message || 'Completion failed');
      }

      setPaymentState({
        reference: '',
        authorizationUrl: '',
      });

      Toast.show({
        type: 'success',
        text1: 'Request submitted',
        text2:
          response.message ||
          'We will notify you when a matching property is available.',
      });
      navigation.goBack();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Completion failed',
        text2: getErrorMessage(error, 'Could not complete notification request'),
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Submit Property Request</Text>
        <Text style={styles.subtitle}>
          Tell us what you need and we will notify you by email and WhatsApp when a matching property is available.
        </Text>

        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>
            {config.payment_required ? 'Current request fee' : 'Request status'}
          </Text>
          <Text style={styles.priceAmount}>
            {config.payment_required
              ? `N${Number(config.amount || 0).toLocaleString()}`
              : 'No payment required'}
          </Text>
          <Text style={styles.priceMeta}>
            {config.payment_required
              ? 'A one-time payment is required before the request is processed.'
              : 'Requests currently go through immediately without payment.'}
          </Text>
          {config.payment_required && !config.location_complete ? (
            <Text style={styles.priceMeta}>
              Select both state and local government area to confirm the exact fee.
            </Text>
          ) : null}
        </View>

        <Input
          label="Full Name"
          value={form.full_name}
          onChangeText={(value) => onChange('full_name', value)}
          placeholder="Your full name"
        />
        <Input
          label="Email"
          value={form.email}
          onChangeText={(value) => onChange('email', value)}
          placeholder="Email address"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          label="WhatsApp Phone"
          value={form.phone}
          onChangeText={(value) => onChange('phone', value)}
          placeholder="+234..."
          keyboardType="phone-pad"
        />

        <SelectField
          label="Property Type"
          value={selectedType?.label}
          placeholder="Select property type"
          onPress={() => setShowTypePicker(true)}
        />

        <SelectField
          label="Preferred State"
          value={selectedState?.state_name}
          placeholder="Select state"
          onPress={() => setShowStatePicker(true)}
        />

        <SelectField
          label="Preferred Local Government Area"
          value={form.lga_name}
          placeholder={selectedState ? 'Select LGA' : 'Choose state first'}
          onPress={() => setShowLgaPicker(true)}
          disabled={!selectedState}
        />

        <Input
          label="Preferred City / Area"
          value={form.city}
          onChangeText={(value) => onChange('city', value)}
          placeholder="Optional"
        />
        <Input
          label="Minimum Price"
          value={form.min_price}
          onChangeText={(value) => onChange('min_price', value)}
          keyboardType="numeric"
          placeholder="Optional"
        />
        <Input
          label="Maximum Price"
          value={form.max_price}
          onChangeText={(value) => onChange('max_price', value)}
          keyboardType="numeric"
          placeholder="Optional"
        />
        <Input
          label="Bedrooms"
          value={form.bedrooms}
          onChangeText={(value) => onChange('bedrooms', value)}
          keyboardType="numeric"
          placeholder="Optional"
        />
        <Input
          label="Bathrooms"
          value={form.bathrooms}
          onChangeText={(value) => onChange('bathrooms', value)}
          keyboardType="numeric"
          placeholder="Optional"
        />

        <Button
          title={config.payment_required ? 'Proceed to Payment' : 'Submit Request'}
          onPress={submitRequest}
          loading={loading}
        />

        {paymentState.reference ? (
          <View style={styles.pendingCard}>
            <Text style={styles.pendingTitle}>Payment Pending</Text>
            <Text style={styles.pendingText}>Reference: {paymentState.reference}</Text>
            <Button
              title="Complete Request"
              onPress={() => completePaidRequest()}
              loading={paymentLoading}
              style={styles.marginTop}
            />
            <Button
              title="Reopen Payment Page"
              variant="outline"
              onPress={() => Linking.openURL(paymentState.authorizationUrl)}
              disabled={!paymentState.authorizationUrl}
              style={styles.marginTop}
            />
          </View>
        ) : null}
      </ScrollView>

      <OptionPickerModal
        visible={showTypePicker}
        title="Select Property Type"
        options={propertyTypes}
        selectedValue={form.property_type}
        onClose={() => setShowTypePicker(false)}
        onSelect={(item) => onChange('property_type', item.value)}
        getOptionLabel={(item) => item.label}
        getOptionValue={(item) => item.value}
      />

      <OptionPickerModal
        visible={showStatePicker}
        title="Select State"
        options={locationOptions}
        selectedValue={form.state_id}
        searchable
        searchPlaceholder="Search states"
        onClose={() => setShowStatePicker(false)}
        onSelect={(item) => onChange('state_id', String(item.id))}
        getOptionLabel={(item) => item.state_name}
        getOptionValue={(item) => item.id}
      />

      <OptionPickerModal
        visible={showLgaPicker}
        title="Select Local Government Area"
        options={availableLgas}
        selectedValue={form.lga_name}
        searchable
        searchPlaceholder="Search LGAs"
        onClose={() => setShowLgaPicker(false)}
        onSelect={(item) => onChange('lga_name', String(item))}
        getOptionLabel={(item) => String(item)}
        getOptionValue={(item) => String(item)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { padding: 20, paddingBottom: 36 },
  title: { fontSize: 30, fontWeight: '800', color: '#0f172a' },
  subtitle: { marginTop: 6, marginBottom: 16, color: '#64748b', lineHeight: 20 },
  priceCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbeafe',
    backgroundColor: '#f8fbff',
    padding: 14,
    marginBottom: 18,
  },
  priceLabel: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  priceAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 4,
  },
  priceMeta: {
    marginTop: 6,
    color: '#64748b',
    lineHeight: 18,
  },
  pendingCard: {
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    padding: 14,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  pendingText: {
    marginTop: 6,
    color: '#475569',
  },
  marginTop: {
    marginTop: 10,
  },
});

export default PropertyAlertRequestScreen;
