import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
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
import Icon from 'react-native-vector-icons/Ionicons';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import BrandMark from '../../components/brand/BrandMark';
import SelectField from '../../components/common/SelectField';
import OptionPickerModal from '../../components/common/OptionPickerModal';
import { AuthContext } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { propertyService } from '../../services/propertyService';
import { getErrorMessage, pickList, pickObject } from '../../utils/http';
import { colors, radius, shadows, typography } from '../../theme';

const LAWYER_ACCESS_FEE = 2000;
const AGENT_ACCESS_FEE = 5000;
const TENANT_REGISTRATION_FEE = 3000;
const LANDLORD_REGISTRATION_FEE = 5000;

const defaultFlags = {
  loaded: false,
  allow_registration: true,
  registration_allowed: true,
  registration_global_allowed: true,
  registration_master_enabled: true,
  registration_location_restricted: false,
  registration_access_message: null,
  nin_number: true,
  passport_number: true,
  tenant_registration_payment: false,
  landlord_registration_payment: false,
};

const referralCodePattern = /^[A-Za-z0-9_-]+$/;

const RegisterScreen = ({ navigation, route }) => {
  const { register, establishSession } = useContext(AuthContext);
  const scrollRef = useRef(null);
  const initialReferralCode = String(
    route?.params?.referral ||
      route?.params?.referral_code ||
      ''
  ).trim();
  const registrationReference =
    route?.params?.registration_ref ||
    route?.params?.reference ||
    route?.params?.trxref ||
    '';
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
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
    amount: 3000,
    base_amount: 3000,
    location_required: false,
    location_complete: false,
    rule_scope: 'base',
  });
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    lawyer_email: '',
    use_rentalhub_lawyers: false,
    use_rentalhub_agents: false,
    referral_code: initialReferralCode,
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
  const steps = [
    { title: 'About you', short: 'Account' },
    { title: 'Your support', short: 'Support' },
    { title: 'Identity and location', short: 'Identity' },
    { title: 'Secure and review', short: 'Review' },
  ];
  const requiresRegistrationPayment =
    (userType === 'tenant' && registrationFlags.tenant_registration_payment) ||
    (userType === 'landlord' && registrationFlags.landlord_registration_payment);
  const requiresLawyerPayment = form.use_rentalhub_lawyers === true;
  const requiresAgentPayment = userType === 'landlord' && form.use_rentalhub_agents === true;
  const requiresPayment =
    requiresRegistrationPayment || requiresLawyerPayment || requiresAgentPayment;
  const baseRegistrationAmount =
    registrationPricing.amount || (userType === 'tenant' ? TENANT_REGISTRATION_FEE : LANDLORD_REGISTRATION_FEE);
  const displayedRegistrationAmount =
    (requiresRegistrationPayment ? baseRegistrationAmount : 0) +
    (requiresLawyerPayment ? LAWYER_ACCESS_FEE : 0) +
    (requiresAgentPayment ? AGENT_ACCESS_FEE : 0);
  const isFormComplete = Boolean(
    acceptedTerms &&
      registrationFlags.loaded &&
      registrationFlags.registration_allowed &&
      form.full_name.trim() &&
      emailPattern.test(form.email.trim()) &&
      form.phone.trim() &&
      (form.use_rentalhub_lawyers || emailPattern.test(form.lawyer_email.trim())) &&
      form.password.length >= 8 &&
      form.password === form.confirm_password &&
      (userType !== 'landlord' ||
        !form.add_agent ||
        form.use_rentalhub_agents ||
        (form.agent_full_name.trim() &&
          emailPattern.test(form.agent_email.trim()) &&
          form.agent_phone.trim())) &&
      (!registrationFlags.registration_location_restricted ||
        (form.state_id && form.lga_name.trim())) &&
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
          allow_registration: data.registration_allowed !== false,
          registration_allowed: data.registration_allowed !== false,
          registration_global_allowed: data.registration_global_allowed !== false,
          registration_master_enabled: data.registration_master_enabled !== false,
          registration_location_restricted: data.registration_location_restricted === true,
          registration_access_message: data.registration_access_message || null,
          nin_number: data.nin_number !== false,
          passport_number: data.passport_number !== false,
          tenant_registration_payment: data.tenant_registration_payment === true,
          landlord_registration_payment: data.landlord_registration_payment === true,
        });
        setRegistrationPricing(
          data.pricing || {
            amount: userType === 'tenant' ? 3000 : 5000,
            base_amount: userType === 'tenant' ? 3000 : 5000,
            location_required: false,
            location_complete: false,
            rule_scope: 'base',
          }
        );
      } catch (error) {
        if (!active) return;
        setRegistrationFlags((prev) => ({ ...prev, loaded: true }));
        setRegistrationPricing({
          amount: userType === 'tenant' ? 3000 : 5000,
          base_amount: userType === 'tenant' ? 3000 : 5000,
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
      lawyer_email: form.use_rentalhub_lawyers ? '' : form.lawyer_email.trim().toLowerCase(),
      use_rentalhub_lawyers: form.use_rentalhub_lawyers === true,
      use_rentalhub_agents: userType === 'landlord' && form.use_rentalhub_agents === true,
      add_agent: userType === 'landlord' ? form.add_agent === true : false,
      agent_full_name:
        userType === 'landlord' && form.add_agent && !form.use_rentalhub_agents
          ? form.agent_full_name.trim()
          : '',
      agent_email:
        userType === 'landlord' && form.add_agent && !form.use_rentalhub_agents
          ? form.agent_email.trim().toLowerCase()
          : '',
      agent_phone:
        userType === 'landlord' && form.add_agent && !form.use_rentalhub_agents
          ? form.agent_phone.trim()
          : '',
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

    const referralCode = String(form.referral_code || '').trim();
    if (referralCode) {
      payload.referral_code = referralCode;
    }

    return payload;
  };

  const validateForm = () => {
    const required = [form.full_name, form.email, form.phone, form.password];

    if (required.some((entry) => !entry?.trim())) {
      return 'Full name, email, phone, and password are required.';
    }

    if (!form.use_rentalhub_lawyers && !form.lawyer_email?.trim()) {
      return 'Enter a lawyer email or choose RentalHub NG lawyers.';
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

    if (!acceptedTerms) {
      return 'Accept the Terms and Privacy Policy to continue.';
    }

    if (!form.use_rentalhub_lawyers && !emailPattern.test(form.lawyer_email || '')) {
      return 'Enter a valid lawyer email.';
    }

    if (userType === 'landlord' && form.add_agent && !form.use_rentalhub_agents) {
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

    const referralCode = String(form.referral_code || '').trim();
    if (referralCode && !referralCodePattern.test(referralCode)) {
      return 'Referral code can only contain letters, numbers, - or _';
    }

    return null;
  };

  const validateStep = (step) => {
    if (step === 0) {
      if (!form.full_name.trim() || !form.email.trim() || !form.phone.trim()) {
        return 'Enter your full name, email address and phone number.';
      }
      if (!emailPattern.test(form.email.trim())) {
        return 'Enter a valid email address.';
      }
      const referralCode = String(form.referral_code || '').trim();
      if (referralCode && !referralCodePattern.test(referralCode)) {
        return 'Referral code can only contain letters, numbers, - or _.';
      }
    }

    if (step === 1) {
      if (!form.use_rentalhub_lawyers && !emailPattern.test(form.lawyer_email.trim())) {
        return 'Enter a valid lawyer email or choose RentalHub NG lawyers.';
      }
      if (userType === 'landlord' && form.add_agent && !form.use_rentalhub_agents) {
        if (!form.agent_full_name.trim()) return 'Enter the agent’s full name.';
        if (!emailPattern.test(form.agent_email.trim())) return 'Enter a valid agent email.';
        if (!form.agent_phone.trim()) return 'Enter the agent’s phone number.';
      }
    }

    if (step === 2) {
      const locationRequired =
        requiresRegistrationPayment || registrationFlags.registration_location_restricted;
      if (locationRequired && !form.state_id) return 'Select your state.';
      if (locationRequired && !form.lga_name.trim()) return 'Select your local government area.';
      if (!isForeigner && registrationFlags.nin_number && !/^\d{11}$/.test(form.nin)) {
        return 'Enter your 11-digit NIN.';
      }
      if (
        isForeigner &&
        registrationFlags.passport_number &&
        !passportPattern.test(form.international_passport_number.trim())
      ) {
        return 'Enter a valid international passport number.';
      }
      if (isForeigner && registrationFlags.passport_number && !form.nationality.trim()) {
        return 'Enter your nationality.';
      }
    }

    if (step === 3) {
      if (form.password.length < 8) return 'Password must be at least 8 characters.';
      if (form.password !== form.confirm_password) return 'Passwords do not match.';
      if (!acceptedTerms) return 'Accept the Terms and Privacy Policy to continue.';
    }

    return null;
  };

  const changeStep = (nextStep) => {
    setCurrentStep(Math.max(0, Math.min(steps.length - 1, nextStep)));
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: true }));
  };

  const continueRegistration = () => {
    if (!registrationFlags.loaded) {
      Toast.show({
        type: 'info',
        text1: 'Checking registration',
        text2: 'Please wait while we load the current registration rules.',
      });
      return;
    }
    const error = validateStep(currentStep);
    if (error) {
      Toast.show({ type: 'error', text1: 'Complete this step', text2: error });
      return;
    }
    changeStep(currentStep + 1);
  };

  const handleRegistrationBack = () => {
    if (currentStep > 0) {
      changeStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleRegister = async () => {
    if (!registrationFlags.registration_master_enabled) {
      Toast.show({
        type: 'error',
        text1: 'Registration disabled',
        text2: 'Registration is currently disabled.',
      });
      return;
    }

    if (!registrationFlags.registration_global_allowed) {
      Toast.show({
        type: 'error',
        text1: 'Registration disabled',
        text2:
          userType === 'landlord'
            ? 'Landlord registration is currently disabled.'
            : 'Tenant registration is currently disabled.',
      });
      return;
    }

    if (!registrationFlags.registration_allowed) {
      Toast.show({
        type: 'error',
        text1: 'Registration unavailable',
        text2:
          registrationFlags.registration_access_message ||
          'Registration is not available for the selected location.',
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

    if (requiresPayment) {
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
      <View style={styles.topBar}>
        <TouchableOpacity
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={handleRegistrationBack}
          style={styles.backButton}>
          <Icon name="arrow-back" size={22} color={colors.navy} />
        </TouchableOpacity>
        <BrandMark compact />
        <View style={styles.topBarSpacer} />
      </View>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.progressHeader}>
          <Text style={styles.stepCount}>STEP {currentStep + 1} OF {steps.length}</Text>
          <Text style={styles.stepPercent}>{Math.round(((currentStep + 1) / steps.length) * 100)}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${((currentStep + 1) / steps.length) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.eyebrow}>{steps[currentStep].short.toUpperCase()}</Text>
        <Text style={styles.title}>{steps[currentStep].title}</Text>
        <Text style={styles.subtitle}>
          {currentStep === 0
            ? 'Choose how you’ll use RentalHub and tell us how to reach you.'
            : currentStep === 1
              ? 'Choose the legal and agent support that fits your rental journey.'
              : currentStep === 2
                ? 'Add your location and the identity details required for verification.'
                : 'Create a secure password and review everything before continuing.'}
        </Text>

        {!registrationFlags.loaded ? (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Loading registration settings</Text>
            <Text style={styles.noticeText}>
              We are checking the current registration and payment rules for this role.
            </Text>
          </View>
        ) : null}

        {registrationFlags.loaded && !registrationFlags.registration_master_enabled ? (
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>Registration is currently disabled</Text>
            <Text style={styles.warningText}>
              Please try again later or contact support if this should already be open.
            </Text>
          </View>
        ) : null}

        {registrationFlags.loaded &&
        registrationFlags.registration_master_enabled &&
        !registrationFlags.registration_global_allowed ? (
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>
              {userType === 'landlord' ? 'Landlord registration disabled' : 'Tenant registration disabled'}
            </Text>
          </View>
        ) : null}

        {registrationFlags.registration_location_restricted &&
        !registrationFlags.registration_allowed &&
        registrationFlags.registration_access_message ? (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeText}>{registrationFlags.registration_access_message}</Text>
          </View>
        ) : null}

        {currentStep === 0 ? (
          <>
        <Text style={styles.choiceLabel}>I’m registering as</Text>
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

        <Text style={styles.choiceLabel}>Citizenship</Text>
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
          </>
        ) : null}

        {currentStep === 3 ? (
        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>
            AMOUNT DUE TODAY
          </Text>
          <Text style={styles.priceAmount}>
            {requiresPayment
              ? `₦${Number(displayedRegistrationAmount || 0).toLocaleString()}`
              : 'No payment required'}
          </Text>
          <Text style={styles.priceMeta}>
            {requiresPayment
              ? 'Includes registration and any selected RentalHub NG lawyer or agent access fees.'
              : `No payment required for ${userType} registration right now.`}
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
        ) : null}

        {currentStep === 0 ? (
          <View style={styles.stepCard}>
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
          </View>
        ) : null}

        {currentStep === 1 ? (
          <View style={styles.stepCard}>
        <TouchableOpacity
          style={styles.agentToggle}
          onPress={() =>
            setForm((prev) => ({
              ...prev,
              use_rentalhub_lawyers: !prev.use_rentalhub_lawyers,
              lawyer_email: !prev.use_rentalhub_lawyers ? '' : prev.lawyer_email,
            }))
          }
        >
          <Text style={styles.agentToggleLabel}>
            {form.use_rentalhub_lawyers
              ? 'Using RentalHub NG lawyers (₦2,000)'
              : 'Use RentalHub NG lawyers instead (₦2,000)'}
          </Text>
        </TouchableOpacity>

        {!form.use_rentalhub_lawyers ? (
          <Input
            label="Lawyer Email"
            value={form.lawyer_email}
            onChangeText={(value) => onChange('lawyer_email', value)}
            placeholder="lawyer@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            icon="briefcase-outline"
          />
        ) : null}

        {userType === 'landlord' ? (
          <TouchableOpacity
            style={styles.agentToggle}
            onPress={() =>
              setForm((prev) => ({
                ...prev,
                use_rentalhub_agents: !prev.use_rentalhub_agents,
                add_agent: prev.use_rentalhub_agents ? prev.add_agent : false,
              }))
            }
          >
            <Text style={styles.agentToggleLabel}>
              {form.use_rentalhub_agents
                ? 'Using RentalHub NG agents (₦5,000)'
                : 'Use RentalHub NG agents instead (₦5,000)'}
            </Text>
          </TouchableOpacity>
        ) : null}
          </View>
        ) : null}

        {currentStep === 0 ? (
          <View style={styles.stepCard}>
        <Input
          label="Referral Code (optional)"
          value={form.referral_code}
          onChangeText={(value) => onChange('referral_code', value)}
          placeholder="Enter invite code if you have one"
          autoCapitalize="none"
          icon="gift-outline"
        />

        {initialReferralCode && form.referral_code ? (
          <Text style={styles.helperBlock}>
            Referral code applied from your invite link.
          </Text>
        ) : null}
          </View>
        ) : null}

        {currentStep === 1 && userType === 'landlord' && !form.use_rentalhub_agents ? (
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

        {currentStep === 2 ? (
          <View style={styles.stepCard}>
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
          </View>
        ) : null}

        {currentStep === 3 ? (
          <>
          <View style={styles.reviewCard}>
            <View style={styles.reviewHeading}>
              <View>
                <Text style={styles.reviewEyebrow}>ACCOUNT SUMMARY</Text>
                <Text style={styles.reviewTitle}>
                  {form.full_name || 'Your RentalHub account'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => changeStep(0)} style={styles.editButton}>
                <Icon name="pencil-outline" size={16} color={colors.blue} />
              </TouchableOpacity>
            </View>
            <View style={styles.reviewRow}>
              <Icon name="person-outline" size={17} color={colors.muted} />
              <Text style={styles.reviewText}>
                {userType === 'landlord' ? 'Landlord' : 'Tenant'} · {isForeigner ? 'International' : 'Nigerian'}
              </Text>
            </View>
            <View style={styles.reviewRow}>
              <Icon name="mail-outline" size={17} color={colors.muted} />
              <Text style={styles.reviewText}>{form.email || 'Email not entered'}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Icon name="location-outline" size={17} color={colors.muted} />
              <Text style={styles.reviewText}>
                {[form.lga_name, selectedState?.state_name].filter(Boolean).join(', ') || 'Location not required'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => changeStep(1)} style={styles.reviewSupport}>
              <Text style={styles.reviewSupportText}>
                {form.use_rentalhub_lawyers
                  ? 'RentalHub lawyer support selected'
                  : `Personal lawyer: ${form.lawyer_email || 'not entered'}`}
              </Text>
              <Icon name="chevron-forward" size={16} color={colors.blue} />
            </TouchableOpacity>
          </View>

          <View style={styles.stepCard}>
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
          <TouchableOpacity
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acceptedTerms }}
            activeOpacity={0.8}
            onPress={() => setAcceptedTerms((value) => !value)}
            style={styles.termsRow}>
            <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
              {acceptedTerms ? <Icon name="checkmark" size={15} color={colors.white} /> : null}
            </View>
            <Text style={styles.termsText}>
              I agree to RentalHub’s{' '}
              <Text
                onPress={(event) => {
                  event.stopPropagation();
                  Linking.openURL('https://rentalhub.com.ng/terms');
                }}
                style={styles.termsLink}>
                Terms
              </Text>{' '}
              and{' '}
              <Text
                onPress={(event) => {
                  event.stopPropagation();
                  Linking.openURL('https://rentalhub.com.ng/privacy');
                }}
                style={styles.termsLink}>
                Privacy Policy
              </Text>
              .
            </Text>
          </TouchableOpacity>
          </View>

        <Button
          title={requiresPayment ? 'Proceed to Payment' : 'Create Account'}
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
          </>
        ) : null}

        <View style={styles.stepNavigation}>
          {currentStep > 0 ? (
            <Button
              title="Back"
              variant="outline"
              onPress={() => changeStep(currentStep - 1)}
              style={styles.stepNavButton}
            />
          ) : null}
          {currentStep < steps.length - 1 ? (
            <Button
              title="Continue"
              onPress={continueRegistration}
              style={styles.stepNavButton}
              disabled={!registrationFlags.loaded}
            />
          ) : null}
        </View>

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
  container: { flex: 1, backgroundColor: colors.surface },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 10,
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'android' ? 14 : 8,
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
  topBarSpacer: { width: 42 },
  content: { padding: 22, paddingBottom: 42 },
  progressHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  stepCount: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 13,
    letterSpacing: 1.25,
  },
  stepPercent: {
    color: colors.muted,
    fontFamily: typography.semibold,
    fontSize: 13,
  },
  progressTrack: {
    backgroundColor: colors.border,
    borderRadius: 4,
    height: 5,
    marginTop: 9,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: colors.blue,
    borderRadius: 4,
    height: 5,
  },
  eyebrow: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 13,
    letterSpacing: 1.25,
    marginTop: 16,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 32,
    letterSpacing: -1.25,
    marginTop: 9,
  },
  subtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 24,
    marginTop: 9,
  },
  stepCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: 15,
    padding: 17,
    ...shadows.soft,
  },
  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  choiceLabel: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 13,
    marginBottom: 8,
    marginLeft: 2,
  },
  toggleBtn: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleBtnActive: {
    borderColor: colors.blue,
    backgroundColor: colors.surfaceBlue,
  },
  toggleText: { fontFamily: typography.semibold, color: colors.text },
  toggleTextActive: { color: colors.blue },
  priceCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#CFE1FB',
    backgroundColor: colors.white,
    padding: 18,
    marginBottom: 22,
    marginTop: 4,
    ...shadows.soft,
  },
  priceLabel: {
    color: colors.muted,
    fontSize: 13,
    fontFamily: typography.semibold,
  },
  priceAmount: {
    fontSize: 32,
    fontFamily: typography.bold,
    color: colors.ink,
    marginTop: 4,
  },
  priceMeta: {
    marginTop: 6,
    color: colors.muted,
    fontFamily: typography.regular,
    lineHeight: 18,
  },
  pendingMeta: {
    marginTop: 8,
    color: '#1d4ed8',
    fontWeight: '600',
  },
  reviewCard: {
    backgroundColor: colors.navy,
    borderRadius: radius.lg,
    marginBottom: 15,
    overflow: 'hidden',
    padding: 18,
  },
  reviewHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  reviewEyebrow: {
    color: '#9BC3F4',
    fontFamily: typography.bold,
    fontSize: 13,
    letterSpacing: 1.25,
  },
  reviewTitle: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 20,
    marginTop: 3,
  },
  editButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  reviewRow: {
    alignItems: 'center',
    borderTopColor: 'rgba(255,255,255,0.1)',
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingVertical: 10,
  },
  reviewText: {
    color: '#D8E4F5',
    flex: 1,
    fontFamily: typography.regular,
    fontSize: 13,
    marginLeft: 8,
  },
  reviewSupport: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.sm,
    flexDirection: 'row',
    marginTop: 5,
    padding: 11,
  },
  reviewSupportText: {
    color: '#D8E4F5',
    flex: 1,
    fontFamily: typography.medium,
    fontSize: 13,
  },
  agentBlock: {
    marginBottom: 8,
  },
  agentToggle: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderColor: '#CFE1FB',
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: 10,
    minHeight: 50,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  agentToggleLabel: {
    color: colors.blue,
    fontFamily: typography.semibold,
    fontSize: 13,
    textAlign: 'center',
  },
  termsRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    marginTop: 1,
    paddingVertical: 5,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1.5,
    height: 22,
    justifyContent: 'center',
    marginRight: 10,
    width: 22,
  },
  checkboxChecked: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  termsText: {
    color: colors.text,
    flex: 1,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 17,
  },
  termsLink: {
    color: colors.blue,
    fontFamily: typography.semibold,
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
  cta: { marginTop: 8 },
  stepNavigation: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  stepNavButton: {
    flex: 1,
  },
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
  footerText: { color: colors.muted, fontFamily: typography.regular },
  footerLink: { color: colors.blue, fontFamily: typography.bold },
});

export default RegisterScreen;
