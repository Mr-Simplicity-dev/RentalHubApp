import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import {useLanguage} from '../../context/LanguageContext';
const consentCopy=require('../../i18n/propertyRequestConsent.cjs');
import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import SelectField from '../../components/common/SelectField';
import OptionPickerModal from '../../components/common/OptionPickerModal';
import { propertyService } from '../../services/propertyService';
import useNativePaystackCheckout from '../../hooks/useNativePaystackCheckout';
import { hasPaystackCheckout } from '../../services/nativePaymentService';
import { getErrorMessage, pickList, pickObject } from '../../utils/http';
import { colors, radius, shadows, typography, typeScale } from '../../theme';

import AppText from '../../components/common/AppText';
const propertyTypes = [
  { get "label"() { return ui("Apartment"); }, value: 'apartment' },
  { get "label"() { return ui("House"); }, value: 'house' },
  { get "label"() { return ui("Duplex"); }, value: 'duplex' },
  { get "label"() { return ui("Studio"); }, value: 'studio' },
  { get "label"() { return ui("Bungalow"); }, value: 'bungalow' },
  { get "label"() { return ui("Flat"); }, value: 'flat' },
  { get "label"() { return ui("Room"); }, value: 'room' },
];

const defaultPricing = {
  amount: 5000,
  base_amount: 5000,
  location_required: false,
  location_complete: false,
  rule_scope: 'base',
};

const PropertyAlertRequestScreen = ({ route, navigation }) => {
  const interfaceLanguage = useInterfaceLanguage();
  const {language}=useLanguage();
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
    transaction: null,
  });
  const [form, setForm] = useState({
    full_name: route?.params?.full_name || '',
    email: route?.params?.email || '',
    phone: '',
    whatsapp_opt_in: false,
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
    [form.state_id, locationOptions, interfaceLanguage]
  );
  const availableLgas = selectedState?.lgas || [];
  const { openNativeCheckout, NativePaystackCheckoutModal } = useNativePaystackCheckout();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation, interfaceLanguage]);

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
      return ui("Name, email and property type are required.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return ui("Enter a valid email address.");
    }

    if (
      form.min_price &&
      form.max_price &&
      Number(form.min_price) > Number(form.max_price)
    ) {
      return ui("Maximum price must be greater than minimum price.");
    }

    if (
      [form.min_price, form.max_price, form.bedrooms, form.bathrooms].some(
        (value) => value && (!Number.isFinite(Number(value)) || Number(value) < 0)
      )
    ) {
      return ui("Budget, bedroom and bathroom values must be valid positive numbers.");
    }

    if (config.payment_required && !form.state_id) {
      return ui("Select your preferred state to calculate the request fee.");
    }

    if (config.payment_required && !form.lga_name.trim()) {
      return ui("Select your preferred local government area to calculate the request fee.");
    }

    return null;
  };

  const buildPayload = () => ({
    full_name: form.full_name.trim(),
    email: form.email.trim().toLowerCase(),
    phone: form.phone.trim() || undefined,
    whatsapp_opt_in: form.whatsapp_opt_in === true,
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
        text1: ui("Request failed"),
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
          transaction: responseData,
        });
        if (hasPaystackCheckout(responseData)) {
          openNativeCheckout({
            transaction: responseData,
            title: ui("Pay property request"),
            subtitle: ui("Complete your property alert request securely in the app."),
            amountLabel: config.amount ? ui("₦{value0}", {value0: (Number(config.amount).toLocaleString())}) : '',
            onSuccess: (paymentResponse) =>
              completePaidRequest(paymentResponse?.reference || responseData.reference),
            onBrowserFallback: () => {
              Toast.show({
                type: 'info',
                text1: ui("Paystack checkout opened"),
                text2: ui("Complete payment securely, then return here and finish the request."),
              });
            },
          });
        }
        return;
      }

      if (response.success) {
        Toast.show({
          type: 'success',
          text1: ui("Request submitted"),
          text2:
            response.message ||
            ui("We will notify you when a matching property is available."),
        });
        navigation.goBack();
      } else {
        throw new Error(response.message || 'Request failed');
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Request failed"),
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
        transaction: null,
      });

      Toast.show({
        type: 'success',
        text1: ui("Request submitted"),
        text2:
          response.message ||
          ui("We will notify you when a matching property is available."),
      });
      navigation.goBack();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Completion failed"),
        text2: getErrorMessage(error, 'Could not complete notification request'),
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  const reopenPendingPayment = () => {
    if (!paymentState.transaction && !paymentState.authorizationUrl) return;

    openNativeCheckout({
      transaction:
        paymentState.transaction || {
          reference: paymentState.reference,
          authorization_url: paymentState.authorizationUrl,
        },
      title: ui("Complete property request"),
      subtitle: ui("Finish payment so we can submit your property alert request."),
      amountLabel: config.amount ? ui("₦{value0}", {value0: (Number(config.amount).toLocaleString())}) : '',
      onSuccess: (paymentResponse) =>
        completePaidRequest(paymentResponse?.reference || paymentState.reference),
      onBrowserFallback: () => {
        Toast.show({
          type: 'info',
          text1: ui("Paystack checkout opened"),
          text2: ui("Complete payment securely, then return and finish the request."),
        });
      },
    });
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel={ui("Go back")}
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="arrow-back" size={22} color={colors.navy} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <AppText style={styles.headerEyebrow}>{ui("PERSONALISED SEARCH")}</AppText>
          <AppText style={styles.headerTitle}>{ui("Property request")}</AppText>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.introIcon}>
          <Icon name="notifications-outline" size={24} color={colors.blue} />
        </View>
        <AppText style={styles.title}>{ui("Tell us what home you need")}</AppText>
        <AppText style={styles.subtitle}>{ui("We’ll notify you by email and WhatsApp when a matching verified property becomes available.")}</AppText>

        <View style={styles.priceCard}>
          <View style={styles.priceIcon}>
            <Icon
              name={config.payment_required ? 'card-outline' : 'checkmark-circle-outline'}
              size={21}
              color={config.payment_required ? colors.gold : colors.success}
            />
          </View>
          <AppText style={styles.priceLabel}>
            {config.payment_required ? ui('Current request fee') : ui('Request status')}
          </AppText>
          <AppText style={styles.priceAmount}>
            {config.payment_required
              ? ui("₦{value0}", {value0: (Number(config.amount || 0).toLocaleString())})
              : ui('No payment required')}
          </AppText>
          <AppText style={styles.priceMeta}>
            {config.payment_required
              ? ui('A one-time payment is required before the request is processed.')
              : ui('Requests currently go through immediately without payment.')}
          </AppText>
          {config.payment_required && !config.location_complete ? (
            <AppText style={styles.priceMeta}>{ui("Select both state and local government area to confirm the exact fee.")}</AppText>
          ) : null}
        </View>

        <AppText style={styles.sectionLabel}>{ui("YOUR CONTACT")}</AppText>
        <View style={styles.formCard}>
        <Input
          label={ui("Full Name")}
          value={form.full_name}
          onChangeText={(value) => onChange('full_name', value)}
          placeholder={ui("Your full name")}
        />
        <Input
          label={ui("Email")}
          value={form.email}
          onChangeText={(value) => onChange('email', value)}
          placeholder={ui("Email address")}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          label={ui("WhatsApp Phone")}
          value={form.phone}
          onChangeText={(value) => onChange('phone', value)}
          placeholder="+234..."
          keyboardType="phone-pad"
        />
        <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{checked:form.whatsapp_opt_in === true}} onPress={()=>onChange('whatsapp_opt_in',!form.whatsapp_opt_in)} style={{flexDirection:'row',alignItems:'flex-start',gap:10,paddingVertical:12}}><Icon name={form.whatsapp_opt_in?'checkbox':'square-outline'} size={24} color={colors.blue} /><AppText style={{flex:1,color:colors.text}}>{consentCopy[language] || consentCopy.en}</AppText></TouchableOpacity>
        </View>

        <AppText style={styles.sectionLabel}>{ui("PROPERTY PREFERENCES")}</AppText>
        <View style={styles.formCard}>
        <SelectField
          label={ui("Property Type")}
          value={selectedType?.label}
          placeholder={ui("Select property type")}
          onPress={() => setShowTypePicker(true)}
        />

        <SelectField
          label={ui("Preferred State")}
          value={selectedState?.state_name}
          placeholder={ui("Select state")}
          onPress={() => setShowStatePicker(true)}
        />

        <SelectField
          label={ui("Preferred Local Government Area")}
          value={form.lga_name}
          placeholder={selectedState ? ui("Select LGA") : 'Choose state first'}
          onPress={() => setShowLgaPicker(true)}
          disabled={!selectedState}
        />

        <Input
          label={ui("Preferred City / Area")}
          value={form.city}
          onChangeText={(value) => onChange('city', value)}
          placeholder={ui("Optional")}
        />
        </View>

        <AppText style={styles.sectionLabel}>{ui("BUDGET AND SPACE")}</AppText>
        <View style={styles.formCard}>
        <Input
          label={ui("Minimum Price")}
          value={form.min_price}
          onChangeText={(value) => onChange('min_price', value)}
          keyboardType="numeric"
          placeholder={ui("Optional")}
        />
        <Input
          label={ui("Maximum Price")}
          value={form.max_price}
          onChangeText={(value) => onChange('max_price', value)}
          keyboardType="numeric"
          placeholder={ui("Optional")}
        />
        <Input
          label={ui("Bedrooms")}
          value={form.bedrooms}
          onChangeText={(value) => onChange('bedrooms', value)}
          keyboardType="numeric"
          placeholder={ui("Optional")}
        />
        <Input
          label={ui("Bathrooms")}
          value={form.bathrooms}
          onChangeText={(value) => onChange('bathrooms', value)}
          keyboardType="numeric"
          placeholder={ui("Optional")}
        />
        </View>

        <Button
          title={config.payment_required ? ui("Proceed to Payment") : ui("Submit Request")}
          onPress={submitRequest}
          loading={loading}
          size="lg"
          style={styles.submitButton}
        />

        {paymentState.reference ? (
          <View style={styles.pendingCard}>
            <View style={styles.pendingHeading}>
              <Icon name="time-outline" size={21} color={colors.blue} />
              <AppText style={styles.pendingTitle}>{ui("Payment pending")}</AppText>
            </View>
            <AppText style={styles.pendingText}>{ui("Reference: ")}{paymentState.reference}</AppText>
            <Button
              title={ui("Complete Request")}
              onPress={() => completePaidRequest()}
              loading={paymentLoading}
              style={styles.marginTop}
            />
            <Button
              title={ui("Open Payment Options")}
              variant="outline"
              onPress={reopenPendingPayment}
              disabled={!paymentState.authorizationUrl && !paymentState.transaction}
              style={styles.marginTop}
            />
          </View>
        ) : null}
      </ScrollView>

      <OptionPickerModal
        visible={showTypePicker}
        title={ui("Select Property Type")}
        options={propertyTypes}
        selectedValue={form.property_type}
        onClose={() => setShowTypePicker(false)}
        onSelect={(item) => onChange('property_type', item.value)}
        getOptionLabel={(item) => item.label}
        getOptionValue={(item) => item.value}
      />

      <OptionPickerModal
        visible={showStatePicker}
        title={ui("Select State")}
        options={locationOptions}
        selectedValue={form.state_id}
        searchable
        searchPlaceholder={ui("Search states")}
        onClose={() => setShowStatePicker(false)}
        onSelect={(item) => onChange('state_id', String(item.id))}
        getOptionLabel={(item) => item.state_name}
        getOptionValue={(item) => item.id}
      />

      <OptionPickerModal
        visible={showLgaPicker}
        title={ui("Select Local Government Area")}
        options={availableLgas}
        selectedValue={form.lga_name}
        searchable
        searchPlaceholder={ui("Search LGAs")}
        onClose={() => setShowLgaPicker(false)}
        onSelect={(item) => onChange('lga_name', String(item))}
        getOptionLabel={(item) => String(item)}
        getOptionValue={(item) => String(item)}
      />
      {NativePaystackCheckoutModal}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  keyboardView: { flex: 1 },
  header: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 21,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  headerCopy: { alignItems: 'center', flex: 1 },
  headerSpacer: { width: 42 },
  headerEyebrow: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: typeScale.xs,
    lineHeight: 18,
    letterSpacing: 0.8,
  },
  headerTitle: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: typeScale.lg,
    lineHeight: 28,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  content: { padding: 20, paddingBottom: 40 },
  introIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 23,
    height: 46,
    justifyContent: 'center',
    marginTop: 8,
    width: 46,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: typeScale.xxl,
    letterSpacing: -0.3,
    lineHeight: 36,
    marginTop: 16,
  },
  subtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.reading,
    lineHeight: 22,
    marginBottom: 20,
    marginTop: 8,
  },
  priceCard: {
    backgroundColor: colors.navy,
    borderRadius: radius.lg,
    marginBottom: 25,
    padding: 19,
  },
  priceIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    marginBottom: 14,
    width: 38,
  },
  priceLabel: {
    color: '#AFC2DF',
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  priceAmount: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: typeScale.xl,
    lineHeight: 32,
    marginTop: 4,
  },
  priceMeta: {
    color: '#AFC2DF',
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 6,
  },
  sectionLabel: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: typeScale.xs,
    lineHeight: 18,
    letterSpacing: 0.8,
    marginBottom: 9,
    marginLeft: 3,
    marginTop: 4,
  },
  formCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: 23,
    padding: 17,
    ...shadows.soft,
  },
  submitButton: {
    marginTop: 3,
  },
  pendingCard: {
    backgroundColor: colors.white,
    borderColor: '#CFE1FB',
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: 17,
    padding: 16,
  },
  pendingHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  pendingTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: typeScale.base,
    lineHeight: 24,
  },
  pendingText: {
    color: colors.text,
    fontFamily: typography.regular,
    marginTop: 6,
  },
  marginTop: {
    marginTop: 10,
  },
});

export default PropertyAlertRequestScreen;
