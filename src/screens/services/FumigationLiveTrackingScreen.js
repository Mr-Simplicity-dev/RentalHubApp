import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  SafeAreaView
} from 'react-native';
import fumigationTrackingService from '../../services/fumigationTrackingService';

export default function FumigationLiveTrackingScreen({ route, navigation }) {
  const bookingId = route.params?.bookingId;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [showSignoffModal, setShowSignoffModal] = useState(false);
  const [satisfied, setSatisfied] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [submittingSignoff, setSubmittingSignoff] = useState(false);
  const timerRef = useRef(null);

  const fetchTracking = async () => {
    try {
      const res = await fumigationTrackingService.getTrackingSummary(bookingId);
      setData(res);
      if (res?.safety_and_compliance?.reentry_seconds_remaining) {
        setCountdown(res.safety_and_compliance.reentry_seconds_remaining);
      }
    } catch (err) {
      console.warn('Failed to load fumigation tracking:', err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();
    const interval = setInterval(fetchTracking, 15000);
    return () => clearInterval(interval);
  }, [bookingId]);

  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [countdown]);

  const formatCountdown = (totalSec) => {
    if (totalSec <= 0) return 'SAFE TO ENTER';
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  const handleSignoffSubmit = async () => {
    setSubmittingSignoff(true);
    try {
      await fumigationTrackingService.confirmSignoff(bookingId, {
        satisfied,
        rating: satisfied ? 5 : 2,
        feedback,
        problemReported: !satisfied,
        problemDescription: !satisfied ? problemDescription : ''
      });
      setShowSignoffModal(false);
      Alert.alert(
        satisfied ? 'Service Confirmed' : 'Issue Logged',
        satisfied
          ? 'Thank you for verifying satisfactory fumigation service completion!'
          : 'Your problem report has been submitted to the safety and quality control team.'
      );
      fetchTracking();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to submit confirmation');
    } finally {
      setSubmittingSignoff(false);
    }
  };

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Connecting to field squad radar...</Text>
      </SafeAreaView>
    );
  }

  const isReentrySafe = countdown === 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <Text style={styles.headerRef}>ARH-FC-#{bookingId}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>
                {String(data?.booking?.booking_status || 'IN PROGRESS').replace(/_/g, ' ').toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.headerTitle}>{data?.booking?.service_name || 'Fumigation Service'}</Text>
          <Text style={styles.propertyAddress}>{data?.booking?.property_address}</Text>
        </View>

        {/* Re-entry Countdown Card */}
        <View style={[styles.countdownCard, isReentrySafe ? styles.safeCard : styles.dangerCard]}>
          <Text style={styles.countdownSubtitle}>SAFE PROPERTY RE-ENTRY PROTOCOL</Text>
          <Text style={[styles.countdownTime, isReentrySafe ? styles.safeText : styles.dangerText]}>
            {formatCountdown(countdown)}
          </Text>
          <Text style={styles.countdownExplanation}>
            {isReentrySafe
              ? 'Ventilation period has elapsed. You may safely re-enter and air out windows.'
              : 'Premises must remain vacant during chemical saturation and active ventilation.'}
          </Text>
        </View>

        {/* Telemetry card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Field Squad Telemetry</Text>
          <View style={styles.telemetryRow}>
            <View style={styles.telemetryBox}>
              <Text style={styles.telemetryLabel}>ETA ARRIVAL</Text>
              <Text style={styles.telemetryValue}>{data?.estimates?.eta_minutes || 0} mins</Text>
            </View>
            <View style={styles.telemetryBox}>
              <Text style={styles.telemetryLabel}>DISTANCE</Text>
              <Text style={styles.telemetryValue}>{data?.estimates?.distance_km || 0} km</Text>
            </View>
            <View style={styles.telemetryBox}>
              <Text style={styles.telemetryLabel}>SPEED</Text>
              <Text style={styles.telemetryValue}>{data?.current_location?.speed || 0} km/h</Text>
            </View>
          </View>

          {data?.current_location && (
            <View style={styles.gpsBanner}>
              <View style={styles.gpsPulse} />
              <Text style={styles.gpsText}>
                Live GPS: {data.current_location.latitude.toFixed(4)}, {data.current_location.longitude.toFixed(4)}
              </Text>
            </View>
          )}
        </View>

        {/* Assigned Specialist */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Assigned Specialist Squad</Text>
          <View style={styles.teamContainer}>
            <View style={styles.teamAvatar}>
              <Text style={styles.teamAvatarText}>🛡️</Text>
            </View>
            <View style={styles.teamDetails}>
              <Text style={styles.teamName}>{data?.team?.name || 'Amana Certified Crew'}</Text>
              <Text style={styles.teamSub}>License: {data?.team?.license_number || 'FUM-NG-2026'}</Text>
              <Text style={styles.teamPhone}>{data?.team?.phone || '+234 800 262 6200'}</Text>
            </View>
          </View>
        </View>

        {/* Safety & Chemical Disclosure */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Public Health Chemical Disclosure</Text>
          <View style={styles.chemicalRow}>
            <Text style={styles.chemicalKey}>Applied Compound:</Text>
            <Text style={styles.chemicalVal}>{data?.safety_instructions?.chemical_name || 'Deltamethrin 2.5% EC'}</Text>
          </View>
          <View style={styles.chemicalRow}>
            <Text style={styles.chemicalKey}>NAFDAC Reg No:</Text>
            <Text style={styles.chemicalVal}>{data?.safety_instructions?.nafdac_reg_number || 'A4-2281'}</Text>
          </View>
          <View style={styles.chemicalRow}>
            <Text style={styles.chemicalKey}>Ventilation Period:</Text>
            <Text style={styles.chemicalVal}>{data?.safety_instructions?.ventilation_hours || 4} Hours</Text>
          </View>
        </View>

        {/* Customer Signoff Trigger */}
        <TouchableOpacity
          style={styles.signoffTriggerBtn}
          onPress={() => setShowSignoffModal(true)}
        >
          <Text style={styles.signoffTriggerBtnText}>✍️ Confirm Service or Report Problem</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Signoff Modal */}
      <Modal visible={showSignoffModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Customer Service Verification</Text>
            <Text style={styles.modalSubtitle}>Confirm that the fumigation service was completed satisfactorily.</Text>

            <View style={styles.optionRow}>
              <TouchableOpacity
                style={[styles.optionBtn, satisfied && styles.optionBtnActive]}
                onPress={() => setSatisfied(true)}
              >
                <Text style={[styles.optionBtnText, satisfied && styles.optionBtnTextActive]}>
                  ✅ Satisfied with Service
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optionBtn, !satisfied && styles.optionBtnDangerActive]}
                onPress={() => setSatisfied(false)}
              >
                <Text style={[styles.optionBtnText, !satisfied && styles.optionBtnTextActive]}>
                  ⚠️ Report Problem
                </Text>
              </TouchableOpacity>
            </View>

            {satisfied ? (
              <TextInput
                style={styles.textInput}
                placeholder="Optional feedback on specialist crew performance..."
                value={feedback}
                onChangeText={setFeedback}
                multiline
              />
            ) : (
              <TextInput
                style={[styles.textInput, styles.dangerInput]}
                placeholder="Describe the issue (e.g. chemical odor, delayed crew, property damage)..."
                value={problemDescription}
                onChangeText={setProblemDescription}
                multiline
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowSignoffModal(false)}
              >
                <Text style={styles.cancelBtnText}>Dismiss</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, !satisfied && styles.dangerSubmitBtn]}
                onPress={handleSignoffSubmit}
                disabled={submittingSignoff}
              >
                {submittingSignoff ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Verification</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b' },
  scrollContent: { padding: 16 },
  headerCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  headerRef: { fontSize: 13, fontWeight: '700', color: '#047857' },
  statusBadge: { backgroundColor: '#ecfdf5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: '700', color: '#047857' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  propertyAddress: { fontSize: 13, color: '#64748b', marginTop: 4 },
  countdownCard: { borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 16 },
  safeCard: { backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0' },
  dangerCard: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#ffedd5' },
  countdownSubtitle: { fontSize: 11, fontWeight: '700', color: '#64748b', letterSpacing: 0.5 },
  countdownTime: { fontSize: 32, fontWeight: '800', marginVertical: 6 },
  safeText: { color: '#059669' },
  dangerText: { color: '#ea580c' },
  countdownExplanation: { fontSize: 12, color: '#64748b', textAlign: 'center', lineHeight: 16 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  telemetryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  telemetryBox: { flex: 1, backgroundColor: '#f8fafc', padding: 12, borderRadius: 10, alignItems: 'center' },
  telemetryLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8' },
  telemetryValue: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginTop: 4 },
  gpsBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', padding: 10, borderRadius: 8, marginTop: 12 },
  gpsPulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e', marginRight: 8 },
  gpsText: { fontSize: 12, color: '#15803d', fontWeight: '600' },
  teamContainer: { flexDirection: 'row', alignItems: 'center' },
  teamAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  teamAvatarText: { fontSize: 22 },
  teamDetails: { flex: 1 },
  teamName: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  teamSub: { fontSize: 12, color: '#64748b' },
  teamPhone: { fontSize: 12, color: '#0284c7', marginTop: 2 },
  chemicalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  chemicalKey: { fontSize: 13, color: '#64748b' },
  chemicalVal: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  signoffTriggerBtn: { backgroundColor: '#059669', padding: 16, borderRadius: 14, alignItems: 'center', marginVertical: 8 },
  signoffTriggerBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#ffffff', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  modalSubtitle: { fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 16 },
  optionRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  optionBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center' },
  optionBtnActive: { backgroundColor: '#059669' },
  optionBtnDangerActive: { backgroundColor: '#dc2626' },
  optionBtnText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  optionBtnTextActive: { color: '#ffffff' },
  textInput: { height: 90, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12, textAlignVertical: 'top', marginBottom: 16 },
  dangerInput: { borderColor: '#fca5a5', backgroundColor: '#fff5f5' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  cancelBtnText: { color: '#64748b', fontWeight: '600' },
  submitBtn: { backgroundColor: '#059669', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8 },
  dangerSubmitBtn: { backgroundColor: '#dc2626' },
  submitBtnText: { color: '#ffffff', fontWeight: '700' }
});
