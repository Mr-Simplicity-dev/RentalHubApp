import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {KeyboardAvoidingView,
  Modal,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,} from 'react-native';
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
import TurnstileWidget from '../../components/common/TurnstileWidget';
import { getErrorMessage, pickList, pickObject } from '../../utils/http';
import { colors, radius, shadows, typography, typeScale } from '../../theme';

import AppText from '../../components/common/AppText';
import BankTransferCheckout from '../../components/BankTransferCheckout';
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
  diaspora_registration: false,
  diaspora_registration_payment: false,
  diaspora_base_fee_usd: null,
  diaspora_base_fee_ngn_estimate: null,
};

const referralCodePattern = /^[A-Za-z0-9_-]+$/;

const RegisterScreen = ({ navigation, route }) => {
  const interfaceLanguage = useInterfaceLanguage();
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
  const [showPaymentMethodChooser, setShowPaymentMethodChooser] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [bankTransferData, setBankTransferData] = useState(null);
  const [showBankTransferModal, setShowBankTransferModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [locationOptions, setLocationOptions] = useState([]);
  const [userType, setUserType] = useState('tenant');
  const [isForeigner, setIsForeigner] = useState(false);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showLgaPicker, setShowLgaPicker] = useState(false);
  const [foreignCardAdjustment, setForeignCardAdjustment] = useState(null);
  const [adjustmentBusy, setAdjustmentBusy] = useState(false);
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

  const turnstileTokenRef = useRef(null);
  const turnstileRef = useRef(null);

  const selectedState = useMemo(
    () => locationOptions.find((item) => String(item.id) === String(form.state_id)),
    [form.state_id, locationOptions, interfaceLanguage]
  );
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passportPattern = /^[A-Za-z0-9]{6,20}$/;
  const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{10,}$/;
  const passwordRequirement = 'Password must be at least 10 characters and include uppercase, lowercase, a number, and a special character.';

  const availableLgas = selectedState?.lgas || [];
  const steps = [
    { title: ui("About you"), short: 'Account' },
    { title: ui("Your support"), short: 'Support' },
    { title: ui("Identity and location"), short: 'Identity' },
    { title: ui("Secure and review"), short: 'Review' },
  ];
  const requiresRegistrationPayment =
    (userType === 'tenant' && registrationFlags.tenant_registration_payment) ||
    (userType === 'landlord' && registrationFlags.landlord_registration_payment) ||
    (isForeigner && registrationFlags.diaspora_registration_payment);
  const requiresLawyerPayment = form.use_rentalhub_lawyers === true;
  const requiresAgentPayment = userType === 'landlord' && form.use_rentalhub_agents === true;
  const requiresPayment =
    requiresRegistrationPayment || requiresLawyerPayment || requiresAgentPayment;
  const baseRegistrationAmount =
    registrationPricing.amount || (userType === 'tenant' ? TENANT_REGISTRATION_FEE : LANDLORD_REGISTRATION_FEE);
  const diasporaNgnEstimate = Number(registrationFlags.diaspora_base_fee_ngn_estimate || 0);
  const displayedRegistrationAmount =
    (requiresRegistrationPayment
      ? isForeigner && registrationFlags.diaspora_registration_payment && diasporaNgnEstimate > 0
        ? diasporaNgnEstimate
        : baseRegistrationAmount
      : 0) +
    (requiresLawyerPayment ? LAWYER_ACCESS_FEE : 0) +
    (requiresAgentPayment ? AGENT_ACCESS_FEE : 0);

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
          diaspora_registration: data.diaspora_registration === true,
          diaspora_registration_payment: data.diaspora_registration_payment === true,
          diaspora_base_fee_usd:
            Number(data.diaspora_base_fee_usd) > 0 ? Number(data.diaspora_base_fee_usd) : null,
          diaspora_base_fee_ngn_estimate:
            Number(data.diaspora_base_fee_ngn_estimate) > 0
              ? Number(data.diaspora_base_fee_ngn_estimate)
              : null,
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
      lawyer_email: form.lawyer_email.trim().toLowerCase(),
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
      return ui('Full name, email, phone, and password are required.');
    }

    if (!form.lawyer_email?.trim()) {
      return ui('Enter the lawyer email to use for registration.');
    }

    if (!emailPattern.test(form.email || '')) {
      return ui('Enter a valid email address.');
    }

    if (form.password !== form.confirm_password) {
      return ui('Passwords do not match.');
    }

    if (!passwordPattern.test(form.password)) {
      return ui(passwordRequirement);
    }

    if (!acceptedTerms) {
      return ui('Accept the Terms and Privacy Policy to continue.');
    }

    if (!emailPattern.test(form.lawyer_email.trim())) {
      return ui('Enter a valid lawyer email.');
    }

    if (userType === 'landlord' && form.add_agent && !form.use_rentalhub_agents) {
      if (!form.agent_full_name.trim()) {
        return ui('Agent full name is required when adding an agent.');
      }

      if (!emailPattern.test(form.agent_email || '')) {
        return ui('Enter a valid agent email.');
      }

      if (!form.agent_phone.trim()) {
        return ui('Agent phone is required when adding an agent.');
      }
    }

    if (!isForeigner && registrationFlags.nin_number && !/^\d{11}$/.test(form.nin || '')) {
      return ui('Local users must provide exactly 11 digits NIN.');
    }

    if (
      isForeigner &&
      registrationFlags.passport_number &&
      !/^[A-Za-z0-9]{6,20}$/.test(form.international_passport_number || '')
    ) {
      return ui('Enter a valid international passport number.');
    }

    if (isForeigner && registrationFlags.passport_number && !form.nationality.trim()) {
      return ui('Nationality is required for foreign registrations.');
    }

    if (requiresRegistrationPayment && !form.state_id) {
      return ui('Select your state to calculate the registration fee.');
    }

    if (requiresRegistrationPayment && !form.lga_name.trim()) {
      return ui('Select your local government area to calculate the registration fee.');
    }

    const referralCode = String(form.referral_code || '').trim();
    if (referralCode && !referralCodePattern.test(referralCode)) {
      return ui('Referral code can only contain letters, numbers, - or _');
    }

    return null;
  };

  const validateStep = (step) => {
    if (step === 0) {
      if (!form.full_name.trim() || !form.email.trim() || !form.phone.trim()) {
        return ui('Enter your full name, email address and phone number.');
      }
      if (!emailPattern.test(form.email.trim())) {
        return ui('Enter a valid email address.');
      }
      const referralCode = String(form.referral_code || '').trim();
      if (referralCode && !referralCodePattern.test(referralCode)) {
        return ui('Referral code can only contain letters, numbers, - or _.');
      }
    }

    if (step === 1) {
      if (!emailPattern.test(form.lawyer_email.trim())) {
        return ui('Enter a valid lawyer email.');
      }
      if (userType === 'landlord' && form.add_agent && !form.use_rentalhub_agents) {
        if (!form.agent_full_name.trim()) return ui('Enter the agentâ€™s full name.');
        if (!emailPattern.test(form.agent_email.trim())) return ui('Enter a valid agent email.');
        if (!form.agent_phone.trim()) return ui('Enter the agentâ€™s phone number.');
      }
    }

    if (step === 2) {
      const locationRequired =
        requiresRegistrationPayment || registrationFlags.registration_location_restricted;
      if (locationRequired && !form.state_id) return ui('Select your state.');
      if (locationRequired && !form.lga_name.trim()) return ui('Select your local government area.');
      if (!isForeigner && registrationFlags.nin_number && !/^\d{11}$/.test(form.nin)) {
        return ui('Enter your 11-digit NIN.');
      }
      if (
        isForeigner &&
        registrationFlags.passport_number &&
        !passportPattern.test(form.international_passport_number.trim())
      ) {
        return ui('Enter a valid international passport number.');
      }
      if (isForeigner && registrationFlags.passport_number && !form.nationality.trim()) {
        return ui('Enter your nationality.');
      }
    }

    if (step === 3) {
      if (!passwordPattern.test(form.password)) return ui(passwordRequirement);
      if (form.password !== form.confirm_password) return ui('Passwords do not match.');
      if (!acceptedTerms) return ui('Accept the Terms and Privacy Policy to continue.');
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
        text1: ui("Checking registration"),
        text2: ui("Please wait while we load the current registration rules."),
      });
      return;
    }
    const error = validateStep(currentStep);
    if (error) {
      Toast.show({ type: 'error', text1: ui("Complete this step"), text2: error });
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

  const handleApplicantTypeChange = (value) => {
    if (value && registrationFlags.loaded && registrationFlags.diaspora_registration === false) {
      Toast.show({
        type: 'error',
        text1: ui("Unavailable"),
        text2: ui("Diaspora registration is currently disabled on Amana RentalHub NG."),
      });
      return;
    }
    setIsForeigner(value);
  };

  const handleRegister = async (methodOverride) => {
    if (!registrationFlags.registration_master_enabled) {
      Toast.show({
        type: 'error',
        text1: ui("Registration disabled"),
        text2: ui("Registration is currently disabled."),
      });
      return;
    }

    if (!registrationFlags.registration_global_allowed) {
      Toast.show({
        type: 'error',
        text1: ui("Registration disabled"),
        text2:
          userType === "landlord"
            ? ui("Landlord registration is currently disabled.")
            : ui("Tenant registration is currently disabled."),
      });
      return;
    }

    if (!registrationFlags.registration_allowed) {
      Toast.show({
        type: 'error',
        text1: ui("Registration unavailable"),
        text2:
          registrationFlags.registration_access_message ||
          ui("Registration is not available for the selected location."),
      });
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      Toast.show({
        type: 'error',
        text1: ui("Registration failed"),
        text2: validationError,
      });
      return;
    }

    const payload = buildRegistrationData();

    const turnstileToken = turnstileTokenRef.current;
    if (!turnstileToken) {
      Toast.show({
        type: 'error',
        text1: ui("Security Check"),
        text2: ui("Please complete the security check below."),
      });
      return;
    }

    if (requiresPayment) {
      const chosenMethod = methodOverride || paymentMethod;

      if (!chosenMethod) {
        setShowPaymentMethodChooser(true);
        return;
      }

      setPaymentLoading(true);
      try {
        const response = await authService.initializeRegistrationPayment(
          { ...payload, payment_method: chosenMethod },
          turnstileToken
        );
        const responseData = pickObject(response, ['data']) || {};

        if (responseData.payment_method === 'bank_transfer') {
          setBankTransferData({
            reference: responseData.reference,
            amount: responseData.amount,
            bank_accounts: responseData.bank_accounts || [],
            virtual_account: responseData.virtual_account || null,
          });
          setShowBankTransferModal(true);
          turnstileRef.current?.reset();
          turnstileTokenRef.current = null;
          return;
        }

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
          text1: ui("Payment started"),
          text2: ui("Complete the payment, return to the app, then tap \"Complete Registration\"."),
        });
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: ui("Payment failed"),
          text2: getErrorMessage(error, 'Could not initialize registration payment'),
        });
        turnstileRef.current?.reset();
        turnstileTokenRef.current = null;
      } finally {
        setPaymentLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const response = await register(payload, turnstileToken);
      if (response.success) {
        Toast.show({
          type: 'success',
          text1: ui("Registration complete"),
          text2: ui("Your account has been created."),
        });
      } else {
        Toast.show({
          type: 'error',
          text1: ui("Registration failed"),
          text2: response.message || ui("Please try again."),
        });
        turnstileRef.current?.reset();
        turnstileTokenRef.current = null;
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Registration failed"),
        text2: getErrorMessage(error, ui("Please try again.")),
      });
      turnstileRef.current?.reset();
      turnstileTokenRef.current = null;
    } finally {
      setLoading(false);
    }
  };

  const choosePaymentMethod = (method) => {
    setPaymentMethod(method);
    setShowPaymentMethodChooser(false);
    setTimeout(() => handleRegister(method), 200);
  };

  const closeBankTransfer = () => {
    setShowBankTransferModal(false);
    setBankTransferData(null);
    setPaymentMethod(null);
    turnstileRef.current?.reset();
    turnstileTokenRef.current = null;
  };

  const handleBankTransferPaid = () => {
    setShowBankTransferModal(false);
    setBankTransferData(null);
    setPaymentMethod(null);
    Toast.show({
      type: 'success',
      text1: ui("Registration payment confirmed"),
      text2: ui("Your account has been created. Sign in with the password you chose."),
    });
    navigation.navigate('Login');
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

      setForeignCardAdjustment(null);
      await establishSession(response.data);
      setPaymentState({
        reference: '',
        authorizationUrl: '',
      });

      Toast.show({
        type: 'success',
        text1: ui("Registration complete"),
        text2: ui("Your paid registration has been completed."),
      });
    } catch (error) {
      const serverError = error?.response?.data;
      if (
        error?.response?.status === 402 &&
        serverError?.code === 'FOREIGN_CARD_ADJUSTMENT' &&
        reference
      ) {
        setForeignCardAdjustment({ reference, ...(serverError.data || {}) });
        Toast.show({
          type: 'info',
          text1: ui("Additional payment required"),
          text2: ui("Your card was issued outside Nigeria. Pay the FX adjustment to finish registration."),
        });
        return;
      }
      Toast.show({
        type: 'error',
        text1: ui("Completion failed"),
        text2: getErrorMessage(error, 'Could not complete paid registration'),
      });
    } finally {
      setLoading(false);
    }
  };

  const startForeignCardAdjustment = async () => {
    if (!foreignCardAdjustment) {
      return;
    }
    setAdjustmentBusy(true);
    try {
      const response = await authService.payForeignCardAdjustment(foreignCardAdjustment.reference);
      const data = response?.data || {};
      if (data.authorization_url) {
        await Linking.openURL(data.authorization_url);
        setForeignCardAdjustment((prev) => ({
          ...prev,
          amount: data.amount || prev.amount,
        }));
        Toast.show({
          type: 'info',
          text1: ui("Payment started"),
          text2: ui("After paying, return to the app and tap \"Finish registration\"."),
        });
      } else {
        Toast.show({
          type: 'error',
          text1: ui("Could not start payment"),
          text2: data.message || ui("Please try again."),
        });
      }
    } catch (adjustError) {
      Toast.show({
        type: 'error',
        text1: ui("Payment failed"),
        text2: getErrorMessage(adjustError, 'Could not start the foreign-card payment'),
      });
    } finally {
      setAdjustmentBusy(false);
    }
  };

  const finishAfterForeignCardAdjustment = () => {
    if (!foreignCardAdjustment) {
      return;
    }
    completePaidRegistration(foreignCardAdjustment.reference);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.topBar}>
        <TouchableOpacity
          accessibilityLabel={ui("Go back")}
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
          <AppText style={styles.stepCount}>{ui("STEP ")}{currentStep + 1}{ui(" OF ")}{steps.length}</AppText>
          <AppText style={styles.stepPercent}>{Math.round(((currentStep + 1) / steps.length) * 100)}%</AppText>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${((currentStep + 1) / steps.length) * 100}%` },
            ]}
          />
        </View>
        <AppText style={styles.eyebrow}>{steps[currentStep].short.toUpperCase()}</AppText>
        <AppText style={styles.title}>{steps[currentStep].title}</AppText>
        <AppText style={styles.subtitle}>
          {currentStep === 0
            ? ui('Choose how youâ€™ll use RentalHub and tell us how to reach you.')
            : currentStep === 1
              ? ui('Choose the legal and agent support that fits your rental journey.')
              : currentStep === 2
                ? ui('Add your location and the identity details required for verification.')
                : ui('Create a secure password and review everything before continuing.')}
        </AppText>

        {!registrationFlags.loaded ? (
          <View style={styles.noticeCard}>
            <AppText style={styles.noticeTitle}>{ui("Loading registration settings")}</AppText>
            <AppText style={styles.noticeText}>{ui("We are checking the current registration and payment rules for this role.")}</AppText>
          </View>
        ) : null}

        {registrationFlags.loaded && !registrationFlags.registration_master_enabled ? (
          <View style={styles.warningCard}>
            <AppText style={styles.warningTitle}>{ui("Registration is currently disabled")}</AppText>
            <AppText style={styles.warningText}>{ui("Please try again later or contact support if this should already be open.")}</AppText>
          </View>
        ) : null}

        {registrationFlags.loaded &&
        registrationFlags.registration_master_enabled &&
        !registrationFlags.registration_global_allowed ? (
          <View style={styles.warningCard}>
            <AppText style={styles.warningTitle}>
              {userType === "landlord" ? ui('Landlord registration disabled') : ui('Tenant registration disabled')}
            </AppText>
          </View>
        ) : null}

        {registrationFlags.registration_location_restricted &&
        !registrationFlags.registration_allowed &&
        registrationFlags.registration_access_message ? (
          <View style={styles.noticeCard}>
            <AppText style={styles.noticeText}>{registrationFlags.registration_access_message}</AppText>
          </View>
        ) : null}

        {currentStep === 0 ? (
          <>
        <AppText style={styles.choiceLabel}>{ui("Iâ€™m registering as")}</AppText>
        <View style={styles.toggleRow}>
          {['tenant', 'landlord'].map((role) => (
            <TouchableOpacity
              key={role}
              onPress={() => setUserType(role)}
              style={[styles.toggleBtn, userType === role && styles.toggleBtnActive]}
            >
              <AppText style={[styles.toggleText, userType === role && styles.toggleTextActive]}>
                {role === "tenant" ? ui("Tenant") : ui("Landlord")}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        <AppText style={styles.choiceLabel}>{ui("Citizenship")}</AppText>
        <View style={styles.toggleRow}>
          {[false, true].map((value) => (
            <TouchableOpacity
              key={String(value)}
              onPress={() => handleApplicantTypeChange(value)}
              style={[styles.toggleBtn, isForeigner === value && styles.toggleBtnActive]}
            >
              <AppText style={[styles.toggleText, isForeigner === value && styles.toggleTextActive]}>
                {value ? ui("Foreigner") : ui("Nigerian")}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
          </>
        ) : null}

        {currentStep === 3 ? (
        <View style={styles.priceCard}>
          <AppText style={styles.priceLabel}>{ui("AMOUNT DUE TODAY")}</AppText>
          <AppText style={styles.priceAmount}>
            {requiresPayment
              ? ui("₦{value0}", {value0: (Number(displayedRegistrationAmount || 0).toLocaleString())})
              : ui('No payment required')}
          </AppText>
          <AppText style={styles.priceMeta}>
            {requiresPayment
              ? ui('Includes registration and any selected Amana RentalHub NG lawyer or agent access fees.')
              : ui("No payment required for {value0} registration right now.", {value0: (ui(userType))})}
          </AppText>
          <AppText style={styles.priceMeta}>{ui("Pricing scope:")}{String(registrationPricing.rule_scope || 'base').replace(/_/g, ' ')}
          </AppText>
          {isForeigner && registrationFlags.diaspora_registration_payment ? (
            <AppText style={styles.priceMeta}>{ui("Diaspora rate: USD")}{Number(registrationFlags.diaspora_base_fee_usd || 0).toFixed(2)}
              {diasporaNgnEstimate > 0 ? ui(" (about ₦{value0})", {value0: (diasporaNgnEstimate.toLocaleString())}) : ''}
            </AppText>
          ) : null}
          {requiresRegistrationPayment && form.state_id && form.lga_name && !registrationPricing.location_complete ? (
            <AppText style={styles.pendingMeta}>{ui("Confirming your exact state and LGA pricing. Please wait a moment before continuing.")}</AppText>
          ) : null}
        </View>
        ) : null}

        {currentStep === 0 ? (
          <View style={styles.stepCard}>
        <Input
          label={ui("Full Name")}
          value={form.full_name}
          onChangeText={(value) => onChange('full_name', value)}
          placeholder="John Doe"
          icon="person-outline"
        />
        <Input
          label={ui("Email")}
          value={form.email}
          onChangeText={(value) => onChange('email', value)}
          placeholder="john@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          icon="mail-outline"
        />
        <Input
          label={ui("Phone")}
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
            }))
          }
        >
          <AppText style={styles.agentToggleLabel}>
            {form.use_rentalhub_lawyers
              ? ui('Using Amana RentalHub NG lawyers (₦2,000)')
              : ui('Use Amana RentalHub NG lawyers instead (₦2,000)')}
          </AppText>
        </TouchableOpacity>

        <Input
            label={ui("Lawyer Email")}
            value={form.lawyer_email}
            onChangeText={(value) => onChange('lawyer_email', value)}
            placeholder="lawyer@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            icon="briefcase-outline"
          />

        {userType === "landlord" ? (
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
            <AppText style={styles.agentToggleLabel}>
              {form.use_rentalhub_agents
                ? ui('Using Amana RentalHub NG agents (₦5,000)')
                : ui('Use Amana RentalHub NG agents instead (₦5,000)')}
            </AppText>
          </TouchableOpacity>
        ) : null}
          </View>
        ) : null}

        {currentStep === 0 ? (
          <View style={styles.stepCard}>
        <Input
          label={ui("Referral Code (optional)")}
          value={form.referral_code}
          onChangeText={(value) => onChange('referral_code', value)}
          placeholder={ui("Enter invite code if you have one")}
          autoCapitalize="none"
          icon="gift-outline"
        />

        {initialReferralCode && form.referral_code ? (
          <AppText style={styles.helperBlock}>{ui("Referral code applied from your invite link.")}</AppText>
        ) : null}
          </View>
        ) : null}

        {currentStep === 1 && userType === "landlord" && !form.use_rentalhub_agents ? (
          <View style={styles.agentBlock}>
            <TouchableOpacity
              style={styles.agentToggle}
              onPress={() => onChange('add_agent', !form.add_agent)}
            >
              <AppText style={styles.agentToggleLabel}>
                {form.add_agent ? ui('Remove optional agent setup') : ui('Add optional agent setup')}
              </AppText>
            </TouchableOpacity>

            {form.add_agent ? (
              <>
                <Input
                  label={ui("Agent Full Name")}
                  value={form.agent_full_name}
                  onChangeText={(value) => onChange('agent_full_name', value)}
                  placeholder={ui("Assigned agent full name")}
                  icon="person-outline"
                />
                <Input
                  label={ui("Agent Email")}
                  value={form.agent_email}
                  onChangeText={(value) => onChange('agent_email', value)}
                  placeholder="agent@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  icon="mail-outline"
                />
                <Input
                  label={ui("Agent Phone")}
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
          label={ui("State")}
          value={selectedState?.state_name}
          placeholder={ui("Select state")}
          onPress={() => setShowStatePicker(true)}
          helperText={requiresRegistrationPayment ? 'Required for registration pricing.' : ''}
        />

        <SelectField
          label={ui("Local Government Area")}
          value={form.lga_name}
          placeholder={selectedState ? ui("Select LGA") : 'Choose state first'}
          onPress={() => setShowLgaPicker(true)}
          disabled={!selectedState}
          helperText={requiresRegistrationPayment ? 'Required for registration pricing.' : ''}
        />

        {!isForeigner ? (
          registrationFlags.nin_number ? (
            <Input
              label={ui("NIN")}
              value={form.nin}
              onChangeText={(value) => onChange('nin', value)}
              placeholder={ui("11-digit NIN")}
              keyboardType="number-pad"
              icon="card-outline"
              maxLength={11}
            />
          ) : (
            <AppText style={styles.helperBlock}>{ui("NIN collection is currently disabled.")}</AppText>
          )
        ) : registrationFlags.passport_number ? (
          <>
            <Input
              label={ui("International Passport Number")}
              value={form.international_passport_number}
              onChangeText={(value) => onChange('international_passport_number', value)}
              placeholder={ui("Passport number")}
              autoCapitalize="characters"
              icon="document-outline"
            />
            <Input
              label={ui("Nationality")}
              value={form.nationality}
              onChangeText={(value) => onChange('nationality', value)}
              placeholder={ui("Country")}
              icon="globe-outline"
            />
          </>
        ) : (
          <AppText style={styles.helperBlock}>{ui("Passport collection is currently disabled.")}</AppText>
        )}
          </View>
        ) : null}

        {currentStep === 3 ? (
          <>
          <View style={styles.reviewCard}>
            <View style={styles.reviewHeading}>
              <View>
                <AppText style={styles.reviewEyebrow}>{ui("ACCOUNT SUMMARY")}</AppText>
                <AppText style={styles.reviewTitle}>
                  {form.full_name || ui('Your RentalHub account')}
                </AppText>
              </View>
              <TouchableOpacity onPress={() => changeStep(0)} style={styles.editButton}>
                <Icon name="pencil-outline" size={16} color={colors.blue} />
              </TouchableOpacity>
            </View>
            <View style={styles.reviewRow}>
              <Icon name="person-outline" size={17} color={colors.muted} />
              <AppText style={styles.reviewText}>
                {userType === "landlord" ? ui("Landlord") : ui("Tenant")} Â· {isForeigner ? ui("International") : ui("Nigerian")}
              </AppText>
            </View>
            <View style={styles.reviewRow}>
              <Icon name="mail-outline" size={17} color={colors.muted} />
              <AppText style={styles.reviewText}>{form.email || ui('Email not entered')}</AppText>
            </View>
            <View style={styles.reviewRow}>
              <Icon name="location-outline" size={17} color={colors.muted} />
              <AppText style={styles.reviewText}>
                {[form.lga_name, selectedState?.state_name].filter(Boolean).join(', ') || ui('Location not required')}
              </AppText>
            </View>
            <TouchableOpacity onPress={() => changeStep(1)} style={styles.reviewSupport}>
              <AppText style={styles.reviewSupportText}>
                {form.use_rentalhub_lawyers
                  ? ui("RentalHub lawyer support selected: {value0}", {value0: (form.lawyer_email)})
                  : ui("Personal lawyer: {value0}", {value0: (form.lawyer_email || ui("not entered"))})}
              </AppText>
              <Icon name="chevron-forward" size={16} color={colors.blue} />
            </TouchableOpacity>
          </View>

          <View style={styles.stepCard}>
        <Input
          label={ui("Password")}
          value={form.password}
          onChangeText={(value) => onChange('password', value)}
          placeholder={ui("Minimum 10 characters")}
          secureTextEntry
          icon="lock-closed-outline"
        />
        <AppText style={styles.identityPaymentNotice}>{ui(passwordRequirement)}</AppText>
        <Input
          label={ui("Confirm Password")}
          value={form.confirm_password}
          onChangeText={(value) => onChange('confirm_password', value)}
          placeholder={ui("Repeat password")}
          secureTextEntry
          icon="lock-closed-outline"
        />
          {requiresPayment ? (
            <AppText style={styles.identityPaymentNotice}>{ui("If you choose bank transfer, a collection account may be opened in your name by our regulated banking partner. For that purpose only, it receives the name and, where the partner bank requires it, the NIN from your verified identity record. It does not hold your wallet balance.")}</AppText>
          ) : null}

          <TouchableOpacity
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acceptedTerms }}
            activeOpacity={0.8}
            onPress={() => setAcceptedTerms((value) => !value)}
            style={styles.termsRow}>
            <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
              {acceptedTerms ? <Icon name="checkmark" size={15} color={colors.white} /> : null}
            </View>
            <AppText style={styles.termsText}>{ui("I agree to RentalHubâ€™s")}{' '}
              <AppText
                onPress={(event) => {
                  event.stopPropagation();
                  Linking.openURL('https://rentalhub.com.ng/terms');
                }}
                style={styles.termsLink}>{ui("Terms")}</AppText>{' '}{ui("and")}{' '}
              <AppText
                onPress={(event) => {
                  event.stopPropagation();
                  Linking.openURL('https://rentalhub.com.ng/privacy');
                }}
                style={styles.termsLink}>{ui("Privacy Policy")}</AppText>
              .
            </AppText>
          </TouchableOpacity>
          </View>

        <Button
          title={requiresPayment ? ui("Proceed to Payment") : ui("Create Account")}
          onPress={() => handleRegister()}
          loading={loading || paymentLoading}
          style={styles.cta}
          disabled={!acceptedTerms || !registrationFlags.loaded || loading || paymentLoading}
        />

        <TurnstileWidget
        action="rentalhub_register"
          ref={turnstileRef}
          onToken={(token) => { turnstileTokenRef.current = token; }}
          onExpire={() => { turnstileTokenRef.current = null; }}
          onError={() => { turnstileTokenRef.current = null; }}
        />

        {paymentState.reference ? (
          <View style={styles.paymentCard}>
            <AppText style={styles.paymentTitle}>{ui("Payment Pending")}</AppText>
            <AppText style={styles.paymentText}>{ui("Reference: ")}{paymentState.reference}</AppText>
            <AppText style={styles.paymentText}>{ui("Finish the Paystack flow in your browser, then return here.")}</AppText>
            <Button
              title={ui("Complete Registration")}
              onPress={completePaidRegistration}
              loading={loading}
              style={styles.marginTop}
            />
            <Button
              title={ui("Reopen Payment Page")}
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
              title={ui("Back")}
              variant="outline"
              onPress={() => changeStep(currentStep - 1)}
              style={styles.stepNavButton}
            />
          ) : null}
          {currentStep < steps.length - 1 ? (
            <Button
              title={ui("Continue")}
              onPress={continueRegistration}
              style={styles.stepNavButton}
              disabled={!registrationFlags.loaded}
            />
          ) : null}
        </View>

        <View style={styles.footer}>
          <AppText style={styles.footerText}>{ui("Already have an account?")}</AppText>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <AppText style={styles.footerLink}>{ui(" Sign in")}</AppText>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <OptionPickerModal
        visible={showStatePicker}
        title={ui("Select State")}
        options={locationOptions}
        selectedValue={form.state_id}
        searchable
        searchPlaceholder={ui("Search states")}
        getOptionLabel={(item) => item.state_name}
        getOptionValue={(item) => item.id}
        onClose={() => setShowStatePicker(false)}
        onSelect={(item) => onChange('state_id', String(item.id))}
      />

      <OptionPickerModal
        visible={showLgaPicker}
        title={ui("Select Local Government Area")}
        options={availableLgas}
        selectedValue={form.lga_name}
        searchable
        searchPlaceholder={ui("Search LGAs")}
        getOptionLabel={(item) => String(item)}
        getOptionValue={(item) => String(item)}
        onClose={() => setShowLgaPicker(false)}
        onSelect={(item) => onChange('lga_name', String(item))}
      />

      <Modal
        transparent
        visible={showPaymentMethodChooser}
        animationType="fade"
        onRequestClose={() => setShowPaymentMethodChooser(false)}
      >
        <View style={styles.chooserOverlay}>
          <View style={styles.chooserCard}>
            <AppText style={styles.chooserTitle}>{ui("Choose how to pay")}</AppText>
            <AppText style={styles.chooserAmount}>
              ₦{Number(displayedRegistrationAmount || 0).toLocaleString()}
            </AppText>

            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => choosePaymentMethod('paystack')}
              style={styles.chooserOption}
            >
              <View style={styles.chooserIcon}>
                <Icon name="card-outline" size={22} color="#0d9488" />
              </View>
              <View style={styles.chooserCopy}>
                <AppText style={styles.chooserOptionTitle}>{ui("Pay with card")}</AppText>
                <AppText style={styles.chooserOptionText}>{ui("Card, bank account or USSD via Paystack")}</AppText>
              </View>
              <Icon name="chevron-forward" size={20} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => choosePaymentMethod('bank_transfer')}
              style={styles.chooserOption}
            >
              <View style={styles.chooserIcon}>
                <Icon name="business-outline" size={22} color="#0d9488" />
              </View>
              <View style={styles.chooserCopy}>
                <AppText style={styles.chooserOptionTitle}>{ui("Pay by bank transfer")}</AppText>
                <AppText style={styles.chooserOptionText}>{ui("Transfer to the account shown, then upload your screenshot")}</AppText>
              </View>
              <Icon name="chevron-forward" size={20} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowPaymentMethodChooser(false)}
              style={styles.chooserCancel}
            >
              <AppText style={styles.chooserCancelText}>{ui("Cancel")}</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <BankTransferCheckout
        visible={showBankTransferModal}
        onClose={closeBankTransfer}
        mode="registration"
        amount={bankTransferData?.amount}
        reference={bankTransferData?.reference}
        accounts={bankTransferData?.bank_accounts || []}
        virtualAccount={bankTransferData?.virtual_account || null}
        statusEndpoint={
          bankTransferData?.reference
            ? `/virtual-accounts/registration/${bankTransferData.reference}`
            : undefined
        }
        onRegistrationPaid={handleBankTransferPaid}
        onRegistrationApproved={handleBankTransferPaid}
      />

      {foreignCardAdjustment ? (
        <Modal transparent visible animationType="fade" onRequestClose={() => setForeignCardAdjustment(null)}>
          <View style={styles.adjustOverlay}>
            <View style={styles.adjustCard}>
              <AppText style={styles.adjustTitle}>{ui("Foreign-card adjustment")}</AppText>
              <AppText style={styles.adjustText}>{ui("Your registration was paid at the Nigerian local rate, but your card was issued outside Nigeria. A second payment covering the black-market FX difference plus the foreign-card fee is required before your account is activated.")}</AppText>
              {Number(foreignCardAdjustment.amount || 0) > 0 ? (
                <AppText style={styles.adjustAmount}>{ui("Additional amount: ₦")}{Number(foreignCardAdjustment.amount).toLocaleString()}
                </AppText>
              ) : null}

              <TouchableOpacity
                activeOpacity={0.86}
                disabled={adjustmentBusy}
                onPress={startForeignCardAdjustment}
                style={[styles.adjustPrimary, adjustmentBusy && styles.adjustDisabled]}
              >
                <AppText style={styles.adjustPrimaryText}>
                  {adjustmentBusy ? ui('Starting paymentâ€¦') : ui('Pay foreign-card adjustment')}
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.86}
                disabled={adjustmentBusy}
                onPress={finishAfterForeignCardAdjustment}
                style={[styles.adjustGhost, adjustmentBusy && styles.adjustDisabled]}
              >
                <AppText style={styles.adjustGhostText}>{ui("I have finished paying — finish registration")}</AppText>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.86}
                onPress={() => setForeignCardAdjustment(null)}
                style={styles.adjustGhost}
              >
                <AppText style={styles.adjustCancel}>{ui("Not now")}</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      ) : null}
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
    fontSize: typeScale.xs,
    lineHeight: 18,
    letterSpacing: 0.8,
  },
  stepPercent: {
    color: colors.muted,
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
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
    fontSize: typeScale.xs,
    lineHeight: 18,
    letterSpacing: 0.8,
    marginTop: 16,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: typeScale.xxl,
    lineHeight: 36,
    letterSpacing: -0.3,
    marginTop: 9,
  },
  subtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.base,
    lineHeight: 24,
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
    fontSize: typeScale.xs,
    lineHeight: 18,
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
    fontSize: typeScale.xs,
    lineHeight: 18,
    fontFamily: typography.semibold,
  },
  priceAmount: {
    fontSize: typeScale.hero,
    lineHeight: 40,
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
    fontSize: typeScale.xs,
    lineHeight: 18,
    letterSpacing: 0.8,
  },
  reviewTitle: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: typeScale.lg,
    lineHeight: 28,
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
    fontSize: typeScale.xs,
    lineHeight: 18,
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
    fontSize: typeScale.xs,
    lineHeight: 18,
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
    fontSize: typeScale.xs,
    lineHeight: 18,
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
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  termsLink: {
    fontSize: typeScale.xs,
    lineHeight: 18,
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
    fontSize: typeScale.base,
    lineHeight: 24,
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
  adjustOverlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 26, 61, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  adjustCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 20,
  },
  adjustTitle: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: typeScale.md,
    lineHeight: 26,
  },
  adjustText: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 8,
  },
  adjustAmount: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: typeScale.reading,
    lineHeight: 22,
    marginTop: 12,
  },
  adjustPrimary: {
    backgroundColor: colors.blue,
    borderRadius: 12,
    marginTop: 16,
    paddingVertical: 13,
    alignItems: 'center',
  },
  adjustPrimaryText: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: typeScale.reading,
    lineHeight: 22,
  },
  adjustGhost: {
    borderRadius: 12,
    marginTop: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  adjustGhostText: {
    color: colors.blue,
    fontFamily: typography.semibold,
    fontSize: typeScale.sm,
    lineHeight: 20,
  },
  adjustCancel: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: typeScale.sm,
    lineHeight: 20,
  },
  adjustDisabled: {
    opacity: 0.6,
  },
  identityPaymentNotice: {
    backgroundColor: '#f0fdfa',
    borderColor: '#99f6e4',
    borderRadius: 12,
    borderWidth: 1,
    color: '#115e59',
    fontFamily: typography.regular,
    fontSize: typeScale.reading,
    lineHeight: 22,
    marginBottom: 12,
    padding: 12,
  },
  chooserOverlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 26, 61, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  chooserCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 20,
    gap: 10,
  },
  chooserTitle: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: typeScale.md,
    lineHeight: 26,
  },
  chooserAmount: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: typeScale.xl,
    lineHeight: 32,
    marginBottom: 4,
  },
  chooserOption: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  chooserIcon: {
    alignItems: 'center',
    backgroundColor: '#f0fdfa',
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  chooserCopy: { flex: 1 },
  chooserOptionTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: typeScale.reading,
    lineHeight: 22,
  },
  chooserOptionText: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 2,
  },
  chooserCancel: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  chooserCancelText: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: typeScale.sm,
    lineHeight: 20,
  },
});

export default RegisterScreen;
