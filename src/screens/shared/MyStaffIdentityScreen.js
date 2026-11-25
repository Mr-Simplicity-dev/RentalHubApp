import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  RefreshControl,
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

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const MyStaffIdentityScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [identity, setIdentity] = useState(null);
  const [pendingChallenges, setPendingChallenges] = useState([]);
  const [recentHistory, setRecentHistory] = useState([]);

  // Manual code / scanned challenge lookup
  const [codeInput, setCodeInput] = useState('');
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [matchedChallenge, setMatchedChallenge] = useState(null);
  const [decisionBusyRef, setDecisionBusyRef] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Native QR Camera Scanner
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cameraNotice, setCameraNotice] = useState('');
  const scanLockRef = useRef(false);

  const loadIdentity = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await staffVerificationService.getMyStaffIdentity();
      const data = res?.data?.data || {};
      setIdentity(data.staff_identity || null);
      setPendingChallenges(Array.isArray(data.pending_challenges) ? data.pending_challenges : []);
      setRecentHistory(Array.isArray(data.recent_events) ? data.recent_events : []);
    } catch (err) {
      if (err?.response?.status === 404) {
        setIdentity(null);
        setPendingChallenges([]);
        setRecentHistory([]);
      } else {
        setError(
          err?.response?.data?.message ||
            'Could not load your Amana Staff Identity record.'
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadIdentity();
  }, [loadIdentity]);

  // Poll incoming live confirmation requests every 6 seconds while active
  useEffect(() => {
    if (!identity) return undefined;
    const interval = setInterval(async () => {
      try {
        const res = await staffVerificationService.getMyPendingChallenges();
        const items = res?.data?.data;
        if (Array.isArray(items)) {
          setPendingChallenges(items);
        }
      } catch (_e) {
        // Silent background refresh
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [identity]);

  const handleFindChallenge = async (rawCode) => {
    const cleaned = String(rawCode || '').trim();
    if (!cleaned) {
      setLookupError('Enter the visitor\u2019s 8-character challenge code or scan their challenge QR.');
      return;
    }
    setLookupBusy(true);
    setLookupError('');
    setMatchedChallenge(null);
    setFeedbackMessage('');
    try {
      const res = await staffVerificationService.lookupMyChallenge(cleaned);
      const found = res?.data?.data || null;
      setMatchedChallenge(found);
    } catch (err) {
      setLookupError(
        err?.response?.data?.message ||
          'No active pending challenge matched this code for your staff account.'
      );
    } finally {
      setLookupBusy(false);
    }
  };

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
          'Camera permission was not granted. Enter the visitor\u2019s short manual code below instead.'
        );
      }
    } catch (_e) {
      setCameraNotice('Camera is unavailable right now. Enter the visitor\u2019s manual code below.');
    }
  };

  const handleBarcodeScanned = ({ data }) => {
    if (scanLockRef.current) return;
    const scanned = String(data || '').trim();
    if (!scanned) return;
    scanLockRef.current = true;
    setScannerOpen(false);
    setCodeInput(scanned);
    handleFindChallenge(scanned);
  };

  const handleDecision = async (challengeReference, decision) => {
    setDecisionBusyRef(challengeReference);
    setLookupError('');
    setFeedbackMessage('');
    try {
      await staffVerificationService.respondToChallenge(challengeReference, decision);
      const resultText =
        decision === 'confirm'
          ? `Live confirmation ${challengeReference} CONFIRMED.`
          : `Live confirmation ${challengeReference} REJECTED.`;
      setFeedbackMessage(resultText);
      setMatchedChallenge(null);
      setCodeInput('');
      await loadIdentity({ silent: true });
    } catch (err) {
      setLookupError(
        err?.response?.data?.message ||
          'Could not submit your decision. The challenge may have expired or already been answered.'
      );
    } finally {
      setDecisionBusyRef('');
    }
  };

  const resolvedPhoto = resolveStaffPhotoUrl(identity?.official_photo_url);
  const findButtonLabel = lookupBusy ? 'Searching...' : 'Find Challenge';

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.navy} />
          <AppText style={styles.helperText}>Loading your staff identity...</AppText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadIdentity({ silent: true });
            }}
          />
        }
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroCard}>
          <AppText style={styles.heroEyebrow}>MY STAFF IDENTITY</AppText>
          <AppText style={styles.heroTitle}>Amana Official Identity & Live Confirmation</AppText>
          <AppText style={styles.heroSubtitle}>
            Present your official QR code to visitors and explicitly confirm or reject live verification requests from your authenticated account.
          </AppText>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Icon name="alert-circle" size={16} color={colors.danger} />
            <AppText style={styles.errorText}>{error}</AppText>
          </View>
        ) : null}

        {feedbackMessage ? (
          <View style={styles.successBanner}>
            <Icon name="checkmark-circle" size={16} color={colors.success} />
            <AppText style={styles.successText}>{feedbackMessage}</AppText>
          </View>
        ) : null}

        {!identity ? (
          <View style={styles.card}>
            <AppText style={styles.sectionTitle}>Not Registered Yet</AppText>
            <AppText style={styles.helperText}>
              Your account does not currently have an active Amana Staff Identity record. Contact the Super Administrator to register and approve your official staff verification profile.
            </AppText>
          </View>
        ) : (
          <>
            {/* Official Staff Identity Card + QR */}
            <View style={styles.card}>
              <View style={styles.profileTop}>
                {resolvedPhoto ? (
                  <Image
                    source={{ uri: resolvedPhoto }}
                    style={styles.staffPhoto}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.staffPhotoFallback}>
                    <Icon name="person" size={32} color={colors.muted} />
                  </View>
                )}
                <View style={styles.profileCol}>
                  <AppText style={styles.staffName}>{identity.full_name}</AppText>
                  <AppText style={styles.staffId}>{identity.staff_verification_id}</AppText>
                  <AppText style={styles.staffRole}>{identity.official_role}</AppText>
                  <AppText style={styles.staffDept}>
                    {identity.department} {'\u2022'} {identity.engagement_type_label || identity.engagement_type}
                  </AppText>
                  <AppText style={styles.statusPillText}>
                    Status: {String(identity.registration_status || '').toUpperCase()}
                  </AppText>
                </View>
              </View>

              {identity.qr_data_url ? (
                <View style={styles.qrBlock}>
                  <AppText style={styles.qrHeading}>Your Official Staff QR Code</AppText>
                  <View style={styles.qrWrapper}>
                    <Image
                      source={{ uri: identity.qr_data_url }}
                      style={styles.qrImage}
                      resizeMode="contain"
                    />
                  </View>
                  <AppText style={styles.helperCenter}>
                    Visitors can scan this QR code or enter your Staff ID above on the Amana Verification Portal.
                  </AppText>
                </View>
              ) : null}

              {Array.isArray(identity.approved_activities) && identity.approved_activities.length > 0 ? (
                <View style={styles.activitiesWrap}>
                  <AppText style={styles.subTitle}>Approved Activities</AppText>
                  {identity.approved_activities.map((item, idx) => (
                    <View key={item.code || idx} style={styles.activityRow}>
                      <Icon name="checkmark-circle-outline" size={16} color={colors.success} />
                      <AppText style={styles.activityText}>{item.label}</AppText>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            {/* Incoming Live Confirmation Requests */}
            <View style={styles.card}>
              <AppText style={styles.sectionTitle}>Incoming Live Confirmation Requests</AppText>
              <AppText style={styles.helperText}>
                Only confirm a request if you are actively engaging this visitor right now. Scanning alone never approves a challenge.
              </AppText>

              {pendingChallenges.length === 0 ? (
                <AppText style={styles.mutedNote}>
                  No pending live confirmation requests at this moment.
                </AppText>
              ) : (
                pendingChallenges.map((item) => {
                  const busy = decisionBusyRef === item.challenge_reference;
                  return (
                    <View key={item.challenge_reference} style={styles.challengeItem}>
                      <AppText style={styles.challengeRefText}>
                        {item.challenge_reference} {'\u2022'} Code: {item.short_code}
                      </AppText>
                      <AppText style={styles.challengePurpose}>
                        Purpose: {item.purpose}
                      </AppText>
                      <AppText style={styles.challengeMeta}>
                        Expires: {formatDateTime(item.expires_at)}
                      </AppText>
                      <View style={styles.decisionRow}>
                        <TouchableOpacity
                          style={[styles.confirmButton, busy && styles.buttonDisabled]}
                          disabled={busy}
                          onPress={() => handleDecision(item.challenge_reference, 'confirm')}
                        >
                          <Icon name="checkmark-circle" size={16} color={colors.white} />
                          <AppText style={styles.buttonWhiteText}>CONFIRM</AppText>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.rejectButton, busy && styles.buttonDisabled]}
                          disabled={busy}
                          onPress={() => handleDecision(item.challenge_reference, 'reject')}
                        >
                          <Icon name="close-circle" size={16} color={colors.white} />
                          <AppText style={styles.buttonWhiteText}>REJECT</AppText>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* Scan Visitor Challenge QR or Enter Manual Code */}
            <View style={styles.card}>
              <AppText style={styles.sectionTitle}>Scan Visitor Challenge QR or Enter Code</AppText>
              <TextInput
                value={codeInput}
                onChangeText={setCodeInput}
                placeholder="Enter 8-character code (e.g. ABCD-1234)"
                placeholderTextColor={colors.muted}
                autoCapitalize="characters"
                autoCorrect={false}
                style={styles.input}
              />
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.primaryButton, lookupBusy && styles.buttonDisabled]}
                  onPress={() => handleFindChallenge(codeInput)}
                  disabled={lookupBusy}
                >
                  <AppText style={styles.buttonWhiteText}>{findButtonLabel}</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleOpenScanner}
                >
                  <Icon name="qr-code-outline" size={16} color={colors.navy} />
                  <AppText style={styles.secondaryBtnText}>Scan Challenge QR</AppText>
                </TouchableOpacity>
              </View>

              {cameraNotice ? (
                <AppText style={styles.infoNote}>{cameraNotice}</AppText>
              ) : null}

              {lookupError ? (
                <View style={styles.errorBanner}>
                  <Icon name="alert-circle" size={16} color={colors.danger} />
                  <AppText style={styles.errorText}>{lookupError}</AppText>
                </View>
              ) : null}

              {matchedChallenge ? (
                <View style={styles.challengeItem}>
                  <AppText style={styles.challengeRefText}>
                    Challenge Found: {matchedChallenge.challenge_reference}
                  </AppText>
                  <AppText style={styles.challengePurpose}>
                    Purpose: {matchedChallenge.purpose}
                  </AppText>
                  <AppText style={styles.challengeMeta}>
                    Expires: {formatDateTime(matchedChallenge.expires_at)}
                  </AppText>
                  <View style={styles.decisionRow}>
                    <TouchableOpacity
                      style={styles.confirmButton}
                      onPress={() =>
                        handleDecision(matchedChallenge.challenge_reference, 'confirm')
                      }
                    >
                      <Icon name="checkmark-circle" size={16} color={colors.white} />
                      <AppText style={styles.buttonWhiteText}>CONFIRM IDENTITY</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() =>
                        handleDecision(matchedChallenge.challenge_reference, 'reject')
                      }
                    >
                      <Icon name="close-circle" size={16} color={colors.white} />
                      <AppText style={styles.buttonWhiteText}>REJECT</AppText>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}
            </View>

            {/* Recent Verification History */}
            <View style={styles.card}>
              <AppText style={styles.sectionTitle}>Recent Verification History</AppText>
              {recentHistory.length === 0 ? (
                <AppText style={styles.mutedNote}>No verification events recorded yet.</AppText>
              ) : (
                recentHistory.slice(0, 15).map((ev, index) => (
                  <View key={ev.id || index} style={styles.historyRow}>
                    <AppText style={styles.historyEvent}>
                      {String(ev.event_type || '').replace(/_/g, ' ').toUpperCase()}
                    </AppText>
                    <AppText style={styles.historyTime}>
                      {formatDateTime(ev.created_at)}
                    </AppText>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Native Challenge QR Scanner Modal */}
      <Modal
        visible={scannerOpen}
        animationType="slide"
        onRequestClose={() => setScannerOpen(false)}
      >
        <SafeAreaView style={styles.scannerSafeArea}>
          <View style={styles.scannerHeader}>
            <AppText style={styles.scannerTitle}>Scan Visitor Challenge QR</AppText>
            <TouchableOpacity onPress={() => setScannerOpen(false)}>
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
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  heroCard: {
    backgroundColor: colors.navy,
    borderRadius: 16,
    padding: 18,
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
    fontSize: 20,
  },
  heroSubtitle: {
    color: '#D5E3F7',
    fontSize: 14,
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
    fontSize: 16,
  },
  subTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 14,
  },
  helperText: {
    color: colors.muted,
    fontSize: 13,
  },
  helperCenter: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
  },
  mutedNote: {
    color: colors.muted,
    fontSize: 13,
  },
  infoNote: {
    color: colors.navy,
    fontSize: 13,
  },
  profileTop: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  staffPhoto: {
    width: 76,
    height: 76,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  staffPhotoFallback: {
    width: 76,
    height: 76,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCol: {
    flex: 1,
    gap: 2,
  },
  staffName: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 17,
  },
  staffId: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 13,
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
  statusPillText: {
    color: colors.success,
    fontFamily: typography.bold,
    fontSize: 12,
    marginTop: 2,
  },
  qrBlock: {
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    gap: 8,
  },
  qrHeading: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 14,
  },
  qrWrapper: {
    backgroundColor: colors.white,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qrImage: {
    width: 184,
    height: 184,
  },
  activitiesWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    gap: 6,
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
  challengeItem: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  challengeRefText: {
    color: colors.navy,
    fontFamily: typography.bold,
    fontSize: 14,
  },
  challengePurpose: {
    color: colors.ink,
    fontSize: 14,
  },
  challengeMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  decisionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: colors.success,
    borderRadius: 10,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: colors.danger,
    borderRadius: 10,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.navy,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: colors.surfaceBlue,
    borderWidth: 1,
    borderColor: colors.blue,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  secondaryBtnText: {
    color: colors.navy,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  buttonWhiteText: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 13,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 10,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 13,
    flex: 1,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF3',
    borderRadius: 10,
    padding: 10,
  },
  successText: {
    color: '#0E7A4D',
    fontFamily: typography.semibold,
    fontSize: 13,
    flex: 1,
  },
  historyRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  historyEvent: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 12,
    flex: 1,
  },
  historyTime: {
    color: colors.muted,
    fontSize: 12,
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
  cameraContainer: {
    flex: 1,
  },
  cameraView: {
    flex: 1,
  },
});

export default MyStaffIdentityScreen;
