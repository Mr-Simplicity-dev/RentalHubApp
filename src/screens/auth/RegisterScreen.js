import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import SelectField from '../../components/common/SelectField';
import OptionPickerModal from '../../components/common/OptionPickerModal';
import { AuthContext } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { propertyService } from '../../services/propertyService';
import { getErrorMessage, pickList, pickObject } from '../../utils/http';

const defaultFlags = {
  loaded: false,
  allow_registration: true,
  nin_number: true,
  passport_number: true,
  tenant_registration_payment: false,
  landlord_registration_payment: false,
};

const RegisterScreen = ({ navigation, route }) => {
  const { register, establishSession } = useContext(AuthContext);
  const registrationReference =
    route?.params?.registration_ref ||
    route?.params?.reference ||
    route?.params?.trxref ||
    '';
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [locationOptions, setLocationOptions] = useState([]);
  const [userType, setUserType] = useState('tenant');
  const [isForeigner, setIsForeigner] = useState(false);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showLgaPicker, setShowLgaPicker] = useState(false);
  const [paymentState, setPaymentState] = useState({
    reference: '',
    authorizationUrl: '',
  });
  const [registrationFlags, setRegistrationFlags] = useState(defaultFlags);
  const [registrationPricing, setRegistrationPricing] = useState({
    amount: 2500,
    base_amount: 2500,
    location_required: false,
    location_complete: false,
    rule_scope: 'base',
  });
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    lawyer_email: '',
    add_agent: false,
    agent_full_name: '',
    agent_email: '',
    agent_phone: '',
    nin: '',
    international_passport_number: '',
    nationality: '',
    password: '',
    confirm_password: '',
    state_id: '',
    lga_name: '',
  });

  const selectedState = useMemo(
    () => locationOptions.find((item) => String(item.id) === String(form.state_id)),
    [form.state_id, locationOptions]
  );
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passportPattern = /^[A-Za-z0-9]{6,20}$/;

  const availableLgas = selectedState?.lgas || [];
  const requiresRegistrationPayment =
    (userType === 'tenant' && registrationFlags.tenant_registration_payment) ||
    (userType === 'landlord' && registrationFlags.landlord_registration_payment);
  const displayedRegistrationAmount =
    registrationPricing.amount || (userType === 'tenant' ? 2500 : 5000);
  const isFormComplete = Boolean(
    registrationFlags.loaded &&
      registrationFlags.allow_registration &&
      form.full_name.trim() &&
      emailPattern.test(form.email.trim()) &&
      form.phone.trim() &&
      emailPattern.test(form.lawyer_email.trim()) &&
      form.password.length >= 8 &&
      form.password === form.confirm_password &&
      (userType !== 'landlord' ||
        !form.add_agent ||
        (form.agent_full_name.trim() &&
          emailPattern.test(form.agent_email.trim()) &&
          form.agent_phone.trim())) &&
      (!requiresRegistrationPayment ||
        (form.state_id && form.lga_name.trim() && registrationPricing.location_complete)) &&
      (isForeigner
        ? (!registrationFlags.passport_number ||
            (passportPattern.test(form.international_passport_number.trim()) &&
              form.nationality.trim()))
        : (!registrationFlags.nin_number || /^\d{11}$/.test(form.nin.trim())))
  );

  useEffect(() => {
    let active = true;

    const loadLocationOptions = async () => {
      try {
        const response = await propertyService.getLocationOptions();
        if (!active) return;
        setLocationOptions(pickList(response, ['data']));
      } catch (error) {
        if (!active) return;
        setLocationOptions([]);
      }
    };

    loadLocationOptions();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadRegistrationFlags = async () => {
      try {
        const response = await authService.getRegistrationFlags({
          user_type: userType,
          state_id: form.state_id || undefined,
          lga_name: form.lga_name || undefined,
        });

        if (!active) return;

        const data = pickObject(response, ['data']) || {};
        setRegistrationFlags({
          loaded: true,
          allow_registration: data.allow_registration !== false,
          nin_number: data.nin_number !== false,
          passport_number: data.passport_number !== false,
          tenant_registration_payment: data.tenant_registration_payment === true,
          landlord_registration_payment: data.landlord_registration_payment === true,
        });
        setRegistrationPricing(
          data.pricing || {
            amount: userType === 'tenant' ? 2500 : 5000,
            base_amount: userType === 'tenant' ? 2500 : 5000,
            location_required: false,
            location_complete: false,
            rule_scope: 'base',
          }
        );
      } catch (error) {
        if (!active) return;
        setRegistrationFlags((prev) => ({ ...prev, loaded: true }));
        setRegistrationPricing({
          amount: userType === 'tenant' ? 2500 : 5000,
          base_amount: userType === 'tenant' ? 2500 : 5000,
          location_required: false,
          location_complete: false,
          rule_scope: 'base',
        });
      }
    };

    loadRegistrationFlags();

    return () => {
      active = false;
    };
  }, [form.lga_name, form.state_id, userType]);

  useEffect(() => {
    if (!registrationReference) {
      return;
    }

    setPaymentState((prev) => ({
      ...prev,
      reference: registrationReference,
    }));
    completePaidRegistration(registrationReference);
  }, [registrationReference]);

  const onChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'state_id' ? { lga_name: '' } : {}),
    }));
  };

  const buildRegistrationData = () => {
    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      lawyer_email: form.lawyer_email.trim().toLowerCase(),
      add_agent: userType === 'landlord' ? form.add_agent === true : false,
      agent_full_name:
        userType === 'landlord' && form.add_agent ? form.agent_full_name.trim() : '',
      agent_email:
        userType === 'landlord' && form.add_agent
          ? form.agent_email.trim().toLowerCase()
          : '',
      agent_phone:
        userType === 'landlord' && form.add_agent ? form.agent_phone.trim() : '',
      password: form.password,
      user_type: userType,
      is_foreigner: isForeigner,
      state_id: form.state_id || undefined,
      lga_name: form.lga_name.trim() || undefined,
      identity_document_type: isForeigner ? 'passport' : 'nin',
    };

    if (isForeigner) {
      payload.international_passport_number = form.international_passport_number.trim();
      payload.nationality = form.nationality.trim();
    } else {
      payload.nin = form.nin.trim();
      payload.nationality = 'Nigeria';
    }

    return payload;
  };

  const validateForm = () => {
    const required = [
      form.full_name,
      form.email,
      form.phone,
      form.lawyer_email,
      form.password,
    ];

    if (required.some((entry) => !entry?.trim())) {
      return 'Full name, email, phone, lawyer email, and password are required.';
    }

    if (!emailPattern.test(form.email || '')) {
      return 'Enter a valid email address.';
    }

    if (form.password !== form.confirm_password) {
      return 'Passwords do not match.';
    }

    if (form.password.length < 8) {
      return 'Password must be at least 8 characters.';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.lawyer_email || '')) {
      return 'Enter a valid lawyer email.';
    }

    if (userType === 'landlord' && form.add_agent) {
      if (!form.agent_full_name.trim()) {
        return 'Agent full name is required when adding an agent.';
      }

      if (!emailPattern.test(form.agent_email || '')) {
        return 'Enter a valid agent email.';
      }

      if (!form.agent_phone.trim()) {
        return 'Agent phone is required when adding an agent.';
      }
    }

    if (!isForeigner && registrationFlags.nin_number && !/^\d{11}$/.test(form.nin || '')) {
      return 'Local users must provide exactly 11 digits NIN.';
    }

    if (
      isForeigner &&
      registrationFlags.passport_number &&
      !/^[A-Za-z0-9]{6,20}$/.test(form.international_passport_number || '')
    ) {
      return 'Enter a valid international passport number.';
    }

    if (isForeigner && registrationFlags.passport_number && !form.nationality.trim()) {
      return 'Nationality is required for foreign registrations.';
    }

    if (requiresRegistrationPayment && !form.state_id) {
      return 'Select your state to calculate the registration fee.';
    }

    if (requiresRegistrationPayment && !form.lga_name.trim()) {
      return 'Select your local government area to calculate the registration fee.';
    }

    return null;
  };

  const handleRegister = async () => {
    if (!registrationFlags.allow_registration) {
      Toast.show({
        type: 'error',
        text1: 'Registration disabled',
        text2: 'Registration is currently disabled.',
      });
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      Toast.show({
        type: 'error',
        text1: 'Registration failed',
        text2: validationError,
      });
      return;
    }

    const payload = buildRegistrationData();

    if (requiresRegistrationPayment) {
      setPaymentLoading(true);
      try {
        const response = await authService.initializeRegistrationPayment(payload);
        const responseData = pickObject(response, ['data']) || {};
        const paymentUrl = responseData.authorization_url;
        const reference = responseData.reference;

        if (!paymentUrl || !reference) {
          throw new Error('Payment link was not returned.');
        }

        setPaymentState({
          reference,
          authorizationUrl: paymentUrl,
        });

        await Linking.openURL(paymentUrl);

        Toast.show({
          type: 'success',
          text1: 'Payment started',
          text2: 'Complete the payment, return to the app, then tap "Complete Registration".',
        });
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Payment failed',
          text2: getErrorMessage(error, 'Could not initialize registration payment'),
        });
      } finally {
        setPaymentLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const response = await register(payload);
      if (response.success) {
        Toast.show({
          type: 'success',
          text1: 'Registration complete',
          text2: 'Your account has been created.',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Registration failed',
          text2: response.message || 'Please try again.',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Registration failed',
        text2: getErrorMessage(error, 'Please try again.'),
      });
    } finally {
      setLoading(false);
    }
  };

  const completePaidRegistration = async (reference = paymentState.reference) => {
    if (!reference) {
      return;
    }

    setLoading(true);
    try {
      const response = await authService.completeRegistrationPayment(reference);

      if (!response.success) {
        throw new Error(response.message || 'Payment completion failed');
      }

      await establishSession(response.data);
      setPaymentState({
        reference: '',
        authorizationUrl: '',
      });

      Toast.show({
        type: 'success',
        text1: 'Registration complete',
        text2: 'Your paid registration has been completed.',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Completion failed',
        text2: getErrorMessage(error, 'Could not complete paid registration'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Tenant and landlord onboarding</Text>

        {!registrationFlags.loaded ? (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Loading registration settings</Text>
            <Text style={styles.noticeText}>
              We are checking the current registration and payment rules for this role.
            </Text>
          </View>
        ) : null}

        {registrationFlags.loaded && !registrationFlags.allow_registration ? (
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>Registration is currently disabled</Text>
            <Text style={styles.warningText}>
              Please try again later or contact support if this should already be open.
            </Text>
          </View>
        ) : null}

        <View style={styles.toggleRow}>
          {['tenant', 'landlord'].map((role) => (
            <TouchableOpacity
              key={role}
              onPress={() => setUserType(role)}
              style={[styles.toggleBtn, userType === role && styles.toggleBtnActive]}
            >
              <Text style={[styles.toggleText, userType === role && styles.toggleTextActive]}>
                {role === 'tenant' ? 'Tenant' : 'Landlord'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.toggleRow}>
          {[false, true].map((value) => (
            <TouchableOpacity
              key={String(value)}
              onPress={() => setIsForeigner(value)}
              style={[styles.toggleBtn, isForeigner === value && styles.toggleBtnActive]}
            >
              <Text style={[styles.toggleText, isForeigner === value && styles.toggleTextActive]}>
                {value ? 'Foreigner' : 'Nigerian'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>
            {requiresRegistrationPayment ? 'Registration fee' : 'Current base fee'}
          </Text>
          <Text style={styles.priceAmount}>N{Number(displayedRegistrationAmount || 0).toLocaleString()}</Text>
          <Text style={styles.priceMeta}>
            {requiresRegistrationPayment
              ? `Payment is required before account creation for ${userType}s.`
              : `Payment is currently disabled for ${userType} registration.`}
          </Text>
          <Text style={styles.priceMeta}>
            Pricing scope: {String(registrationPricing.rule_scope || 'base').replace(/_/g, ' ')}
          </Text>
          {requiresRegistrationPayment && form.state_id && form.lga_name && !registrationPricing.location_complete ? (
            <Text style={styles.pendingMeta}>
              Confirming your exact state and LGA pricing. Please wait a moment before continuing.
            </Text>
          ) : null}
        </View>

        <Input
          label="Full Name"
          value={form.full_name}
          onChangeText={(value) => onChange('full_name', value)}
          placeholder="John Doe"
          icon="person-outline"
        />
        <Input
          label="Email"
          value={form.email}
          onChangeText={(value) => onChange('email', value)}
          placeholder="john@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          icon="mail-outline"
        />
        <Input
          label="Phone"
          value={form.phone}
          onChangeText={(value) => onChange('phone', value)}
          placeholder="+2348012345678"
          keyboardType="phone-pad"
          icon="call-outline"
        />
        <Input
          label="Lawyer Email"
          value={form.lawyer_email}
          onChangeText={(value) => onChange('lawyer_email', value)}
          placeholder="lawyer@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          icon="briefcase-outline"
        />

        {userType === 'landlord' ? (
          <View style={styles.agentBlock}>
            <TouchableOpacity
              style={styles.agentToggle}
              onPress={() => onChange('add_agent', !form.add_agent)}
            >
              <Text style={styles.agentToggleLabel}>
                {form.add_agent ? 'Remove optional agent setup' : 'Add optional agent setup'}
              </Text>
            </TouchableOpacity>

            {form.add_agent ? (
              <>
                <Input
                  label="Agent Full Name"
                  value={form.agent_full_name}
                  onChangeText={(value) => onChange('agent_full_name', value)}
                  placeholder="Assigned agent full name"
                  icon="person-outline"
                />
                <Input
                  label="Agent Email"
                  value={form.agent_email}
                  onChangeText={(value) => onChange('agent_email', value)}
                  placeholder="agent@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  icon="mail-outline"
                />
                <Input
                  label="Agent Phone"
                  value={form.agent_phone}
                  onChangeText={(value) => onChange('agent_phone', value)}
                  placeholder="+2348012345678"
                  keyboardType="phone-pad"
                  icon="call-outline"
                />
              </>
            ) : null}
          </View>
        ) : null}

        <SelectField
          label="State"
          value={selectedState?.state_name}
          placeholder="Select state"
          onPress={() => setShowStatePicker(true)}
          helperText={requiresRegistrationPayment ? 'Required for registration pricing.' : ''}
        />

        <SelectField
          label="Local Government Area"
          value={form.lga_name}
          placeholder={selectedState ? 'Select LGA' : 'Choose state first'}
          onPress={() => setShowLgaPicker(true)}
          disabled={!selectedState}
          helperText={requiresRegistrationPayment ? 'Required for registration pricing.' : ''}
        />

        {!isForeigner ? (
          registrationFlags.nin_number ? (
            <Input
              label="NIN"
              value={form.nin}
              onChangeText={(value) => onChange('nin', value)}
              placeholder="11-digit NIN"
              keyboardType="number-pad"
              icon="card-outline"
              maxLength={11}
            />
          ) : (
            <Text style={styles.helperBlock}>NIN collection is currently disabled.</Text>
          )
        ) : registrationFlags.passport_number ? (
          <>
            <Input
              label="International Passport Number"
              value={form.international_passport_number}
              onChangeText={(value) => onChange('international_passport_number', value)}
              placeholder="Passport number"
              autoCapitalize="characters"
              icon="document-outline"
            />
            <Input
              label="Nationality"
              value={form.nationality}
              onChangeText={(value) => onChange('nationality', value)}
              placeholder="Country"
              icon="globe-outline"
            />
          </>
        ) : (
          <Text style={styles.helperBlock}>Passport collection is currently disabled.</Text>
        )}

        <Input
          label="Password"
          value={form.password}
          onChangeText={(value) => onChange('password', value)}
          placeholder="Minimum 8 characters"
          secureTextEntry
          icon="lock-closed-outline"
        />
        <Input
          label="Confirm Password"
          value={form.confirm_password}
          onChangeText={(value) => onChange('confirm_password', value)}
          placeholder="Repeat password"
          secureTextEntry
          icon="lock-closed-outline"
        />

        <Button
          title={requiresRegistrationPayment ? 'Proceed to Payment' : 'Create Account'}
          onPress={handleRegister}
          loading={loading || paymentLoading}
          style={styles.cta}
          disabled={!isFormComplete}
        />

        {paymentState.reference ? (
          <View style={styles.paymentCard}>
            <Text style={styles.paymentTitle}>Payment Pending</Text>
            <Text style={styles.paymentText}>Reference: {paymentState.reference}</Text>
            <Text style={styles.paymentText}>
              Finish the Paystack flow in your browser, then return here.
            </Text>
            <Button
              title="Complete Registration"
              onPress={completePaidRegistration}
              loading={loading}
              style={styles.marginTop}
            />
            <Button
              title="Reopen Payment Page"
              variant="outline"
              onPress={() => Linking.openURL(paymentState.authorizationUrl)}
              style={styles.marginTop}
              disabled={!paymentState.authorizationUrl}
            />
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}> Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <OptionPickerModal
        visible={showStatePicker}
        title="Select State"
        options={locationOptions}
        selectedValue={form.state_id}
        searchable
        searchPlaceholder="Search states"
        getOptionLabel={(item) => item.state_name}
        getOptionValue={(item) => item.id}
        onClose={() => setShowStatePicker(false)}
        onSelect={(item) => onChange('state_id', String(item.id))}
      />

      <OptionPickerModal
        visible={showLgaPicker}
        title="Select Local Government Area"
        options={availableLgas}
        selectedValue={form.lga_name}
        searchable
        searchPlaceholder="Search LGAs"
        getOptionLabel={(item) => String(item)}
        getOptionValue={(item) => String(item)}
        onClose={() => setShowLgaPicker(false)}
        onSelect={(item) => onChange('lga_name', String(item))}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { padding: 20, paddingBottom: 36 },
  title: { fontSize: 30, fontWeight: '800', color: '#0f172a' },
  subtitle: { marginTop: 6, marginBottom: 16, color: '#64748b' },
  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  toggleBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 10,
    alignItems: 'center',
  },
  toggleBtnActive: {
    borderColor: '#0284c7',
    backgroundColor: '#eff6ff',
  },
  toggleText: { fontWeight: '600', color: '#475569' },
  toggleTextActive: { color: '#0284c7' },
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
  pendingMeta: {
    marginTop: 8,
    color: '#1d4ed8',
    fontWeight: '600',
  },
  agentBlock: {
    marginBottom: 8,
  },
  agentToggle: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#f8fafc',
  },
  agentToggleLabel: {
    color: '#1e293b',
    fontWeight: '600',
  },
  noticeCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    padding: 14,
    marginBottom: 16,
  },
  noticeTitle: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  noticeText: {
    marginTop: 6,
    color: '#1d4ed8',
    lineHeight: 18,
  },
  warningCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    padding: 14,
    marginBottom: 16,
  },
  warningTitle: {
    color: '#991b1b',
    fontWeight: '700',
  },
  warningText: {
    marginTop: 6,
    color: '#b91c1c',
    lineHeight: 18,
  },
  helperBlock: {
    marginBottom: 16,
    color: '#92400e',
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    padding: 10,
  },
  cta: { marginTop: 6 },
  paymentCard: {
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    padding: 14,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  paymentText: {
    marginTop: 6,
    color: '#475569',
  },
  marginTop: {
    marginTop: 10,
  },
  footer: {
    marginTop: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: { color: '#64748b' },
  footerLink: { color: '#0284c7', fontWeight: '700' },
});

export default RegisterScreen;
