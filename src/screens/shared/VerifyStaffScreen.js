import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AppText from '../../components/common/AppText';
import TextInput from '../../components/common/AppTextInput';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, typography } from '../../theme';
import staffVerificationService, {
  resolveStaffPhotoUrl,
} from '../../services/staffVerificationService';

const STATE_META = {
  ACTIVE_REGISTRATION: {
    title: 'ACTIVE REGISTRATION',
    summary:
      'This staff member holds an approved, currently active Amana identity record. Request Live Confirmation below before relying on them.',
    bg: '#ECFDF3',
    border: '#169B62',
    accent: '#0E7A4D',
    icon: 'checkmark-circle',
  },
  LIVE_CONFIRMATION_SUCCESSFUL: {
    title: 'LIVE CONFIRMATION SUCCESSFUL',
    summary:
      'The authenticated Amana staff account explicitly confirmed this verification challenge.',
    bg: '#ECFDF3',
    border: '#0E7A4D',
    accent: '#0A5E3B',
    icon: 'shield-checkmark',
  },
  PENDING: {
    title: 'PENDING',
    summary:
      'Waiting for the registered Amana staff member to confirm or reject this challenge from their authenticated dashboard.',
    bg: '#FFFBEB',
    border: '#D97706',
    accent: '#92400E',
    icon: 'time',
  },
  REJECTED: {
    title: 'REJECTED',
    summary:
      'The registered Amana staff account explicitly REJECTED this verification request. Do not engage or pay this individual.',
    bg: '#FEF2F2',
    border: '#DC2626',
    accent: '#991B1B',
    icon: 'close-circle',
  },
  EXPIRED: {
    title: 'EXPIRED',
    summary:
      'This live verification challenge expired before it was answered. Generate a fresh challenge to verify again.',
    bg: '#F8FAFC',
    border: '#64748B',
    accent: '#334155',
    icon: 'hourglass',
  },
  SUSPENDED: {
    title: 'SUSPENDED',
    summary:
      'This staff registration is currently SUSPENDED. This person is NOT authorised to represent Amana.',
    bg: '#FFF7ED',
    border: '#EA580C',
    accent: '#9A3412',
    icon: 'pause-circle',
  },
  REVOKED: {
    title: 'REVOKED',
    summary:
      'This staff registration has been REVOKED. Do not share sensitive information or transfer money.',
    bg: '#FEF2F2',
    border: '#B91C1C',
    accent: '#7F1D1D',
    icon: 'ban',
  },
  EXPIRED_STAFF_REGISTRATION: {
    title: 'EXPIRED STAFF REGISTRATION',
    summary:
      'This staff registration validity period has expired. This person is no longer authorised to represent Amana.',
    bg: '#FEF2F2',
    border: '#DC2626',
    accent: '#991B1B',
    icon: 'calendar',
  },
  NOT_FOUND: {
    title: 'NOT FOUND',
    summary:
      'No Amana staff record matched this Staff Verification ID or QR code. Do not proceed and report suspected impersonation.',
    bg: '#FEF2F2',
    border: '#B91C1C',
    accent: '#7F1D1D',
    icon: 'alert-circle',
  },
};

const REPORT_CATEGORIES = [
  { key: 'impersonating_staff', label: 'Impersonating Amana staff' },
  { key: 'unauthorized_payment_request', label: 'Asking for personal bank transfer / cash' },
  { key: 'fake_id_or_qr', label: 'Suspicious or fake ID / QR code' },
  { key: 'live_confirmation_rejected', label: 'Live confirmation rejected or avoided' },
  { key: 'face_mismatch', label: 'Person does not match official photograph' },
  { key: 'other', label: 'Other safety concern' },
];

const PAYMENT_SAFETY_BULLETS = [
  'Never transfer money to a staff member\u2019s personal bank account.',
  'Never pay cash to an individual claiming to represent Amana unless officially stated on the verified Amana platform for an explicitly authorised transaction.',
  'All legitimate rent, inspection, registration, and service payments must be completed exclusively through official Amana RentalHub NG payment channels.',
  'Even a verified Amana staff member is NOT authorised to collect payments into a personal account.',
];

const TERMINAL_CHALLENGE_STATES = new Set([
  'LIVE_CONFIRMATION_SUCCESSFUL',
  'REJECTED',
  'EXPIRED',
  'SUSPENDED',
  'REVOKED',
  'EXPIRED_STAFF_REGISTRATION',
]);

const formatDateShort = (value) => {
  if (!value) return 'Not specified';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Not specified';
  return d.toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatCountdown = (seconds) => {
  const safe = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const PaymentSafetyBanner = ({ compact = false }) => (
  <View style={[styles.safetyCard, compact && styles.safetyCardCompact]}>
    <View style={styles.safetyHeader}>
      <Icon name="warning" size={18} color="#92400E" />
      <AppText style={styles.safetyTitle}>IMPORTANT PAYMENT SAFETY NOTICE</AppText>
    </View>
    {PAYMENT_SAFETY_BULLETS.map((bullet, idx) => (
      <View key={idx} style={styles.safetyBulletRow}>
        <AppText style={styles.safetyDot}>{'\u2022'}</AppText>
        <AppText style={styles.safetyText}>{bullet}</AppText>
      </View>
    ))}
  </View>
);

const VerifyStaffScreen = ({ route }) => {
  const initialParam = route?.params?.staffId || route?.params?.id || '';

  const [identifierInput, setIdentifierInput] = useState(String(initialParam || ''));
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [verificationState, setVerificationState] = useState(null);
  const [staffProfile, setStaffProfile] = useState(null);
  const [faceMatchAdvisory, setFaceMatchAdvisory] = useState(
    'Compare the person\u2019s face carefully with the official registered photograph above when meeting them in person.'
  );

  // Native QR Camera Scanner state
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cameraNotice, setCameraNotice] = useState('');
  const scanLockRef = useRef(false);

  // Live Identity Confirmation state
  const [purposeInput, setPurposeInput] = useState('Property inspection / official engagement');
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [challengeError, setChallengeError] = useState('');
  const [challenge, setChallenge] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [liveNote, setLiveNote] = useState('');

  // Impersonation Report modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState('impersonating_staff');
  const [reportClaimedName, setReportClaimedName] = useState('');
  const [reportLocation, setReportLocation] = useState('');
  const [reportContact, setReportContact] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportReceipt, setReportReceipt] = useState(null);

  const performLookup = useCallback(async (rawValue) => {
    const cleaned = String(rawValue || '').trim();
    if (!cleaned) {
      setLookupError('Please enter an Amana Staff Verification ID or scan an official staff QR code.');
      return;
    }

    setLookupLoading(true);
    setLookupError('');
    setChallenge(null);
    setChallengeError('');
    setLiveNote('');

    try {
      const response = await staffVerificationService.lookupPublicStaff(cleaned);
      const payload = response?.data?.data || {};
      setVerificationState(payload.verification_state || 'NOT_FOUND');
      setStaffProfile(payload.staff_profile || null);
      if (payload.face_match_advisory) {
        setFaceMatchAdvisory(payload.face_match_advisory);
      }
      if (payload.staff_profile?.staff_verification_id) {
        setIdentifierInput(payload.staff_profile.staff_verification_id);
      }
    } catch (err) {
      const status = err?.response?.status;
      const errData = err?.response?.data;
      if (status === 404 || errData?.data?.verification_state === 'NOT_FOUND') {
        setVerificationState('NOT_FOUND');
        setStaffProfile(null);
      } else {
        const message =
          errData?.message ||
          'Unable to reach the Amana verification server. Please check your connection and try again.';
        setLookupError(message);
      }
    } finally {
      setLookupLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialParam) {
      performLookup(initialParam);
    }
  }, [initialParam, performLookup]);

  const handleOpenScanner = async () => {
    setCameraNotice('');
    try {
      if (permission?.granted) {
        scanLockRef.current = false;
        setScannerOpen(true);
        return;
      }
      const next = await requestPermission();
      if (next?.granted) {
        scanLockRef.current = false;
        setScannerOpen(true);
      } else {
        setCameraNotice(
          'Camera permission was not granted. You can enable camera access in device settings or type the Staff Verification ID manually below.'
        );
      }
    } catch (err) {
      setCameraNotice(
        'Camera is unavailable on this device right now. Please enter the Staff Verification ID manually below.'
      );
    }
  };

  const handleBarcodeScanned = ({ data }) => {
    if (scanLockRef.current) return;
    const scanned = String(data || '').trim();
    if (!scanned) return;
    scanLockRef.current = true;
    setScannerOpen(false);
    setIdentifierInput(scanned);
    performLookup(scanned);
  };

  const handleRequestLiveConfirmation = async () => {
    if (!staffProfile?.staff_verification_id) return;
    setChallengeLoading(true);
    setChallengeError('');
    setLiveNote('');

    try {
      const res = await staffVerificationService.createLiveChallenge({
        staff_verification_id: staffProfile.staff_verification_id,
        purpose: purposeInput.trim() || 'Official staff identity verification',
      });
      const data = res?.data?.data;
      if (!data) {
        setChallengeError('Could not generate a live confirmation challenge. Please try again.');
        return;
      }
      setChallenge(data);
      setVerificationState(data.verification_state || 'PENDING');
      const expiryMs = new Date(data.expires_at).getTime();
      const remaining = Math.max(0, Math.ceil((expiryMs - Date.now()) / 1000));
      setSecondsLeft(remaining);
    } catch (err) {
      const serverMsg =
        err?.response?.data?.message ||
        'Unable to create a live confirmation challenge right now.';
      setChallengeError(serverMsg);
      if (err?.response?.data?.data?.verification_state) {
        setVerificationState(err.response.data.data.verification_state);
      }
    } finally {
      setChallengeLoading(false);
    }
  };

  // Countdown tick for active challenge
  useEffect(() => {
    if (!challenge || TERMINAL_CHALLENGE_STATES.has(verificationState)) {
      return undefined;
    }
    const timer = setInterval(() => {
      const expiryMs = new Date(challenge.expires_at).getTime();
      const remaining = Math.max(0, Math.ceil((expiryMs - Date.now()) / 1000));
      setSecondsLeft(remaining);
    }, 1000);
    return () => clearInterval(timer);
  }, [challenge, verificationState]);

  // Authoritative backend polling every 2.5s while challenge is PENDING
  useEffect(() => {
    if (
      !challenge?.challenge_reference ||
      !challenge?.visitor_poll_token ||
      TERMINAL_CHALLENGE_STATES.has(verificationState)
    ) {
      return undefined;
    }

    let cancelled = false;
    const poll = async () => {
      try {
        const res = await staffVerificationService.pollLiveChallenge(
          challenge.challenge_reference,
          challenge.visitor_poll_token
        );
        if (cancelled) return;
        const data = res?.data?.data;
        if (!data) return;
        if (data.verification_state) {
          setVerificationState(data.verification_state);
        }
        if (data.status_message) {
          setLiveNote(data.status_message);
        }
        if (data.staff_profile) {
          setStaffProfile(data.staff_profile);
        }
      } catch (_e) {
        // Silent transient network retry on next interval
      }
    };

    const interval = setInterval(poll, 2500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [challenge, verificationState]);

  const handleOpenReportModal = () => {
    setReportError('');
    setReportReceipt(null);
    setReportClaimedName(staffProfile?.full_name || '');
    setReportModalOpen(true);
  };

  const handleSubmitReport = async () => {
    const trimmedDesc = reportDescription.trim();
    if (trimmedDesc.length < 10) {
      setReportError('Please provide at least 10 characters describing what happened.');
      return;
    }

    setReportSubmitting(true);
    setReportError('');
    try {
      const res = await staffVerificationService.submitImpersonationReport({
        staff_verification_id:
          staffProfile?.staff_verification_id || identifierInput.trim() || undefined,
        claimed_name: reportClaimedName.trim() || undefined,
        category: reportCategory,
        description: trimmedDesc,
        incident_location: reportLocation.trim() || undefined,
        reporter_contact: reportContact.trim() || undefined,
      });
      setReportReceipt(res?.data?.data || { report_reference: 'RECORDED' });
      setReportDescription('');
      setReportLocation('');
      setReportContact('');
    } catch (err) {
      setReportError(
        err?.response?.data?.message ||
          'Could not submit the impersonation report right now. Please try again.'
      );
    } finally {
      setReportSubmitting(false);
    }
  };

  const activeStateMeta = verificationState ? STATE_META[verificationState] || STATE_META.NOT_FOUND : null;
  const resolvedPhoto = resolveStaffPhotoUrl(staffProfile?.official_photo_url);
  const canRequestLive = Boolean(
    staffProfile &&
      staffProfile.can_request_live_confirmation &&
      verificationState !== 'SUSPENDED' &&
      verificationState !== 'REVOKED' &&
      verificationState !== 'EXPIRED_STAFF_REGISTRATION'
  );
  const verifyButtonLabel = lookupLoading ? 'Verifying...' : 'Verify Staff ID';
  const liveButtonLabel = challengeLoading
    ? 'Creating Challenge...'
    : 'Request Live Confirmation';
  const submitReportLabel = reportSubmitting ? 'Submitting Report...' : 'Submit Report';
  const paymentAuthText = staffProfile?.financial_collection_authorized
    ? 'Explicitly authorised ONLY for official platform-recorded collection as listed above. Never pay to a personal bank account.'
    : 'NOT authorised to collect payments or receive money into any personal bank account.';
  const validRangeText = staffProfile
    ? `${formatDateShort(staffProfile.valid_from)} \u2014 ${formatDateShort(staffProfile.expires_at)}`
    : '';
  const challengeCountdownText = `Expires in ${formatCountdown(secondsLeft)}`;
  const isChallengeActive = Boolean(challenge && verificationState === 'PENDING');
  const isChallengeTerminal = Boolean(challenge && TERMINAL_CHALLENGE_STATES.has(verificationState));

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Corporate Header Band */}
        <View style={styles.heroCard}>
          <View style={styles.heroBadgeRow}>
            <Icon name="shield-checkmark" size={16} color={colors.gold} />
            <AppText style={styles.heroEyebrow}>AMANA ANTI-IMPERSONATION PORTAL</AppText>
          </View>
          <AppText style={styles.heroTitle}>
            Verify Amana Staff Before Engaging Them
          </AppText>
          <AppText style={styles.heroSubtitle}>
            Confirm anyone claiming to represent Amana RentalHub NG using their official Staff Verification ID or QR code, then complete Live Identity Confirmation. No account is required.
          </AppText>
        </View>

        {/* Mandatory Payment Safety Notice on Landing */}
        <PaymentSafetyBanner />

        {/* Lookup Card */}
        <View style={styles.card}>
          <AppText style={styles.sectionTitle}>Step 1: Look Up Staff Identity</AppText>
          <AppText style={styles.helperText}>
            Enter the unique Amana Staff Verification ID (for example AMN-XXXX-XXXX-XXXX) or scan the staff member&apos;s official Amana QR code.
          </AppText>

          <TextInput
            value={identifierInput}
            onChangeText={setIdentifierInput}
            placeholder="AMN-XXXX-XXXX-XXXX"
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
            autoCorrect={false}
            style={styles.input}
            accessibilityLabel="Amana Staff Verification ID"
            returnKeyType="search"
            onSubmitEditing={() => performLookup(identifierInput)}
          />

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.primaryButton, lookupLoading && styles.buttonDisabled]}
              onPress={() => performLookup(identifierInput)}
              disabled={lookupLoading}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              {lookupLoading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Icon name="search" size={16} color={colors.white} />
              )}
              <AppText style={styles.primaryButtonText}>{verifyButtonLabel}</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleOpenScanner}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Icon name="qr-code-outline" size={17} color={colors.navy} />
              <AppText style={styles.secondaryButtonText}>Scan Staff QR</AppText>
            </TouchableOpacity>
          </View>

          {cameraNotice ? (
            <View style={styles.infoBanner}>
              <Icon name="camera-outline" size={16} color={colors.navy} />
              <AppText style={styles.infoBannerText}>{cameraNotice}</AppText>
            </View>
          ) : null}

          {lookupError ? (
            <View style={styles.errorBanner}>
              <Icon name="alert-circle" size={16} color={colors.danger} />
              <AppText style={styles.errorBannerText}>{lookupError}</AppText>
            </View>
          ) : null}
        </View>

        {/* Verification Status Banner */}
        {activeStateMeta ? (
          <View
            style={[
              styles.statusBanner,
              {
                backgroundColor: activeStateMeta.bg,
                borderColor: activeStateMeta.border,
              },
            ]}
          >
            <View style={styles.statusHeaderRow}>
              <Icon name={activeStateMeta.icon} size={22} color={activeStateMeta.accent} />
              <AppText style={[styles.statusTitle, { color: activeStateMeta.accent }]}>
                {activeStateMeta.title}
              </AppText>
            </View>
            <AppText style={[styles.statusSummary, { color: activeStateMeta.accent }]}>
              {liveNote || activeStateMeta.summary}
            </AppText>
          </View>
        ) : null}

        {/* Public Staff Profile Card */}
        {staffProfile ? (
          <View style={styles.card}>
            <View style={styles.profileTopRow}>
              {resolvedPhoto ? (
                <Image
                  source={{ uri: resolvedPhoto }}
                  style={styles.staffPhoto}
                  resizeMode="cover"
                  accessibilityLabel="Official registered staff photograph"
                />
              ) : (
                <View style={styles.staffPhotoPlaceholder}>
                  <Icon name="person" size={34} color={colors.muted} />
                </View>
              )}

              <View style={styles.profileIdentityCol}>
                <AppText style={styles.staffName}>{staffProfile.full_name}</AppText>
                <AppText style={styles.staffIdCode}>
                  {staffProfile.staff_verification_id}
                </AppText>
                <AppText style={styles.staffRole}>{staffProfile.official_role}</AppText>
                <AppText style={styles.staffDept}>{staffProfile.department}</AppText>
              </View>
            </View>

            <View style={styles.faceMatchBox}>
              <Icon name="eye-outline" size={16} color={colors.navy} />
              <AppText style={styles.faceMatchText}>{faceMatchAdvisory}</AppText>
            </View>

            <View style={styles.metaGrid}>
              <View style={styles.metaRow}>
                <AppText style={styles.metaLabel}>Engagement Type</AppText>
                <AppText style={styles.metaValue}>
                  {staffProfile.engagement_type_label || staffProfile.engagement_type}
                </AppText>
              </View>
              <View style={styles.metaRow}>
                <AppText style={styles.metaLabel}>Registration Status</AppText>
                <AppText style={styles.metaValue}>
                  {String(staffProfile.registration_status || '').toUpperCase()}
                </AppText>
              </View>
              <View style={styles.metaRow}>
                <AppText style={styles.metaLabel}>Validity Period</AppText>
                <AppText style={styles.metaValue}>{validRangeText}</AppText>
              </View>
            </View>

            {/* Approved Activities */}
            <View style={styles.subSection}>
              <AppText style={styles.subSectionTitle}>Approved Activities</AppText>
              {Array.isArray(staffProfile.approved_activities) &&
              staffProfile.approved_activities.length > 0 ? (
                staffProfile.approved_activities.map((act, index) => (
                  <View key={act.code || index} style={styles.activityRow}>
                    <Icon name="checkmark-circle-outline" size={16} color={colors.success} />
                    <AppText style={styles.activityText}>{act.label}</AppText>
                  </View>
                ))
              ) : (
                <AppText style={styles.mutedNote}>
                  No approved public field activities are currently assigned to this record.
                </AppText>
              )}
            </View>

            {/* Payment Authorisation Status */}
            <View style={styles.subSection}>
              <AppText style={styles.subSectionTitle}>Payment Collection Status</AppText>
              <AppText style={styles.paymentAuthNote}>{paymentAuthText}</AppText>
            </View>

            {/* Repeat Compact Safety Notice on Profile */}
            <PaymentSafetyBanner compact />
          </View>
        ) : null}

        {/* Step 2: Live Identity Confirmation */}
        {canRequestLive ? (
          <View style={styles.card}>
            <AppText style={styles.sectionTitle}>Step 2: Live Identity Confirmation</AppText>
            <AppText style={styles.helperText}>
              A static QR code only proves a staff record exists. Request Live Confirmation to require the registered staff member to explicitly approve this verification from their authenticated Amana account within 2 minutes.
            </AppText>

            <AppText style={styles.fieldLabel}>Purpose of Verification</AppText>
            <TextInput
              value={purposeInput}
              onChangeText={setPurposeInput}
              placeholder="e.g., Property inspection at Lekki Phase 1"
              placeholderTextColor={colors.muted}
              style={styles.input}
              maxLength={140}
            />

            <TouchableOpacity
              style={[styles.primaryButton, challengeLoading && styles.buttonDisabled]}
              onPress={handleRequestLiveConfirmation}
              disabled={challengeLoading}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              {challengeLoading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Icon name="pulse" size={16} color={colors.white} />
              )}
              <AppText style={styles.primaryButtonText}>{liveButtonLabel}</AppText>
            </TouchableOpacity>

            {challengeError ? (
              <View style={styles.errorBanner}>
                <Icon name="alert-circle" size={16} color={colors.danger} />
                <AppText style={styles.errorBannerText}>{challengeError}</AppText>
              </View>
            ) : null}

            {challenge ? (
              <View style={styles.challengeBox}>
                <AppText style={styles.challengeHeading}>
                  Show This Challenge to the Staff Member
                </AppText>
                <AppText style={styles.challengeSub}>
                  Ask the staff member to open My Staff Identity in their authenticated Amana account and scan this QR code or enter the short code below.
                </AppText>

                {challenge.qr_data_url ? (
                  <View style={styles.qrWrapper}>
                    <Image
                      source={{ uri: challenge.qr_data_url }}
                      style={styles.qrImage}
                      resizeMode="contain"
                      accessibilityLabel="Live verification challenge QR code"
                    />
                  </View>
                ) : null}

                <View style={styles.shortCodeBox}>
                  <AppText style={styles.shortCodeLabel}>MANUAL CHALLENGE CODE</AppText>
                  <AppText style={styles.shortCodeValue}>{challenge.short_code}</AppText>
                  <AppText style={styles.challengeRef}>
                    Reference: {challenge.challenge_reference}
                  </AppText>
                </View>

                {isChallengeActive ? (
                  <View style={styles.countdownRow}>
                    <ActivityIndicator size="small" color="#92400E" />
                    <AppText style={styles.countdownText}>{challengeCountdownText}</AppText>
                  </View>
                ) : null}

                {isChallengeTerminal ? (
                  <View style={styles.terminalNoteBox}>
                    <AppText style={styles.terminalNoteText}>
                      Live confirmation establishes that the authenticated staff account intentionally responded to this challenge. Always compare the person&apos;s face with the official photograph in person.
                    </AppText>
                    <PaymentSafetyBanner compact />
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Report Suspected Impersonation Card */}
        <View style={styles.reportCard}>
          <View style={styles.reportHeader}>
            <Icon name="flag" size={18} color={colors.danger} />
            <AppText style={styles.reportTitle}>Something Look Suspicious?</AppText>
          </View>
          <AppText style={styles.helperText}>
            If anyone refused live confirmation, does not match the official photograph, used an invalid ID, or asked you to send money to a personal account, report it immediately.
          </AppText>
          <TouchableOpacity
            style={styles.dangerOutlineButton}
            onPress={handleOpenReportModal}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Icon name="alert-circle-outline" size={16} color={colors.danger} />
            <AppText style={styles.dangerOutlineButtonText}>
              Report Suspected Impersonation
            </AppText>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Native QR Scanner Modal */}
      <Modal
        visible={scannerOpen}
        animationType="slide"
        onRequestClose={() => setScannerOpen(false)}
      >
        <SafeAreaView style={styles.scannerSafeArea}>
          <View style={styles.scannerHeader}>
            <AppText style={styles.scannerTitle}>Scan Official Amana Staff QR</AppText>
            <TouchableOpacity
              style={styles.scannerCloseBtn}
              onPress={() => setScannerOpen(false)}
              accessibilityRole="button"
            >
              <Icon name="close" size={22} color={colors.white} />
            </TouchableOpacity>
          </View>
          <View style={styles.cameraContainer}>
            <CameraView
              style={styles.cameraView}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={handleBarcodeScanned}
            />
            <View style={styles.scanFrameOverlay} pointerEvents="none">
              <View style={styles.scanFrameBox} />
              <AppText style={styles.scanGuideText}>
                Align the official Amana Staff QR code inside the frame
              </AppText>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Native Report Suspected Impersonation Modal */}
      <Modal
        visible={reportModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setReportModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle}>Report Suspected Impersonation</AppText>
              <TouchableOpacity
                onPress={() => setReportModalOpen(false)}
                accessibilityRole="button"
              >
                <Icon name="close" size={22} color={colors.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              {reportReceipt ? (
                <View style={styles.receiptBox}>
                  <Icon name="checkmark-circle" size={32} color={colors.success} />
                  <AppText style={styles.receiptTitle}>Report Logged for Amana Security</AppText>
                  <AppText style={styles.receiptRef}>
                    Reference: {reportReceipt.report_reference}
                  </AppText>
                  <AppText style={styles.helperText}>
                    Thank you. Amana Super-Admin Security has recorded this alert for urgent review. Do not transfer money or share personal credentials with the individual.
                  </AppText>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => setReportModalOpen(false)}
                  >
                    <AppText style={styles.primaryButtonText}>Done</AppText>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.modalForm}>
                  <AppText style={styles.fieldLabel}>Reason</AppText>
                  <View style={styles.categoryList}>
                    {REPORT_CATEGORIES.map((cat) => {
                      const selected = reportCategory === cat.key;
                      return (
                        <TouchableOpacity
                          key={cat.key}
                          style={[
                            styles.categoryOption,
                            selected && styles.categoryOptionSelected,
                          ]}
                          onPress={() => setReportCategory(cat.key)}
                        >
                          <AppText
                            style={[
                              styles.categoryOptionText,
                              selected && styles.categoryOptionTextSelected,
                            ]}
                          >
                            {cat.label}
                          </AppText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <AppText style={styles.fieldLabel}>Name Claimed (Optional)</AppText>
                  <TextInput
                    value={reportClaimedName}
                    onChangeText={setReportClaimedName}
                    placeholder="Name the individual used"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                  />

                  <AppText style={styles.fieldLabel}>Location / Platform (Optional)</AppText>
                  <TextInput
                    value={reportLocation}
                    onChangeText={setReportLocation}
                    placeholder="e.g., WhatsApp, Abuja, Lekki inspection"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                  />

                  <AppText style={styles.fieldLabel}>What Happened (Required)</AppText>
                  <TextInput
                    value={reportDescription}
                    onChangeText={setReportDescription}
                    placeholder="Describe the interaction, claimed ID, or payment request..."
                    placeholderTextColor={colors.muted}
                    style={[styles.input, styles.textArea]}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />

                  <AppText style={styles.fieldLabel}>
                    Your Contact Phone or Email (Optional, kept private)
                  </AppText>
                  <TextInput
                    value={reportContact}
                    onChangeText={setReportContact}
                    placeholder="Optional for follow-up"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                  />

                  {reportError ? (
                    <View style={styles.errorBanner}>
                      <Icon name="alert-circle" size={16} color={colors.danger} />
                      <AppText style={styles.errorBannerText}>{reportError}</AppText>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={[styles.dangerButton, reportSubmitting && styles.buttonDisabled]}
                    onPress={handleSubmitReport}
                    disabled={reportSubmitting}
                  >
                    {reportSubmitting ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : null}
                    <AppText style={styles.primaryButtonText}>{submitReportLabel}</AppText>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
    gap: 14,
  },
  heroCard: {
    backgroundColor: colors.navy,
    borderRadius: 16,
    padding: 18,
    gap: 8,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroEyebrow: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 12,
    letterSpacing: 0.6,
  },
  heroTitle: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 22,
  },
  heroSubtitle: {
    color: '#D5E3F7',
    fontSize: 14,
  },
  safetyCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  safetyCardCompact: {
    marginTop: 12,
    padding: 12,
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  safetyTitle: {
    color: '#92400E',
    fontFamily: typography.bold,
    fontSize: 13,
    flex: 1,
  },
  safetyBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  safetyDot: {
    color: '#92400E',
    fontFamily: typography.bold,
    fontSize: 14,
  },
  safetyText: {
    color: '#78350F',
    fontSize: 13,
    flex: 1,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 17,
  },
  helperText: {
    color: colors.muted,
    fontSize: 14,
  },
  fieldLabel: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 13,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: colors.ink,
    fontFamily: typography.medium,
    fontSize: 15,
  },
  textArea: {
    minHeight: 90,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  primaryButton: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.navy,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  secondaryButton: {
    minWidth: 132,
    backgroundColor: colors.surfaceBlue,
    borderWidth: 1,
    borderColor: colors.blue,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    color: colors.navy,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  dangerButton: {
    backgroundColor: colors.danger,
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  dangerOutlineButton: {
    borderWidth: 1.5,
    borderColor: colors.danger,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dangerOutlineButtonText: {
    color: colors.danger,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.surfaceBlue,
    borderRadius: 10,
    padding: 10,
  },
  infoBannerText: {
    color: colors.navy,
    fontSize: 13,
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 10,
  },
  errorBannerText: {
    color: '#991B1B',
    fontSize: 13,
    flex: 1,
  },
  statusBanner: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusTitle: {
    fontFamily: typography.bold,
    fontSize: 16,
    flex: 1,
  },
  statusSummary: {
    fontSize: 14,
  },
  profileTopRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  staffPhoto: {
    width: 84,
    height: 84,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  staffPhotoPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIdentityCol: {
    flex: 1,
    gap: 2,
  },
  staffName: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 18,
  },
  staffIdCode: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 13,
    letterSpacing: 0.4,
  },
  staffRole: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  staffDept: {
    color: colors.muted,
    fontSize: 13,
  },
  faceMatchBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.surfaceBlue,
    borderRadius: 10,
    padding: 10,
  },
  faceMatchText: {
    color: colors.navy,
    fontSize: 13,
    flex: 1,
  },
  metaGrid: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  metaLabel: {
    color: colors.muted,
    fontSize: 13,
  },
  metaValue: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 13,
    textAlign: 'right',
    flexShrink: 1,
  },
  subSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    gap: 6,
  },
  subSectionTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 14,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activityText: {
    color: colors.text,
    fontSize: 14,
    flex: 1,
  },
  mutedNote: {
    color: colors.muted,
    fontSize: 13,
  },
  paymentAuthNote: {
    color: '#991B1B',
    fontFamily: typography.semibold,
    fontSize: 13,
  },
  challengeBox: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    alignItems: 'center',
  },
  challengeHeading: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 15,
    textAlign: 'center',
  },
  challengeSub: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
  },
  qrWrapper: {
    backgroundColor: colors.white,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qrImage: {
    width: 196,
    height: 196,
  },
  shortCodeBox: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  shortCodeLabel: {
    color: colors.muted,
    fontFamily: typography.bold,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  shortCodeValue: {
    color: colors.navy,
    fontFamily: typography.bold,
    fontSize: 24,
    letterSpacing: 2,
  },
  challengeRef: {
    color: colors.muted,
    fontSize: 12,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  countdownText: {
    color: '#92400E',
    fontFamily: typography.bold,
    fontSize: 14,
  },
  terminalNoteBox: {
    width: '100%',
    gap: 6,
  },
  terminalNoteText: {
    color: colors.text,
    fontSize: 13,
    textAlign: 'center',
  },
  reportCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 16,
    gap: 10,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportTitle: {
    color: '#991B1B',
    fontFamily: typography.bold,
    fontSize: 16,
  },
  scannerSafeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.navy,
  },
  scannerTitle: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 16,
  },
  scannerCloseBtn: {
    padding: 6,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  cameraView: {
    flex: 1,
  },
  scanFrameOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 18,
  },
  scanFrameBox: {
    width: 240,
    height: 240,
    borderWidth: 3,
    borderColor: colors.gold,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  scanGuideText: {
    color: colors.white,
    backgroundColor: 'rgba(7, 26, 61, 0.82)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    fontFamily: typography.semibold,
    fontSize: 13,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 26, 61, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 17,
  },
  modalForm: {
    gap: 8,
    paddingBottom: 20,
  },
  categoryList: {
    gap: 6,
  },
  categoryOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
  },
  categoryOptionSelected: {
    borderColor: colors.navy,
    backgroundColor: colors.surfaceBlue,
  },
  categoryOptionText: {
    color: colors.text,
    fontSize: 13,
  },
  categoryOptionTextSelected: {
    color: colors.navy,
    fontFamily: typography.bold,
  },
  receiptBox: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  receiptTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 18,
    textAlign: 'center',
  },
  receiptRef: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 16,
  },
});

export default VerifyStaffScreen;
