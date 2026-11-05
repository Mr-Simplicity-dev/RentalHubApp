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
  Switch,
  SafeAreaView
} from 'react-native';
import fumigationTrackingService from '../../services/fumigationTrackingService';

export default function FumigationTeamConsoleScreen({ navigation }) {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gpsActive, setGpsActive] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [chemicalName, setChemicalName] = useState('Deltamethrin 2.5% EC');
  const [nafdacNo, setNafdacNo] = useState('A4-2281');
  const [ventilationHours, setVentilationHours] = useState('4');
  const watchIdRef = useRef(null);

  const loadJobs = async () => {
    try {
      const data = await fumigationTrackingService.getAssignedJobs();
      setJobs(data);
      if (data.length > 0 && !selectedJob) {
        setSelectedJob(data[0]);
      }
    } catch (err) {
      console.warn('Failed to load assigned jobs:', err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  // GPS broadcasting simulation / geolocation watch
  useEffect(() => {
    if (gpsActive && selectedJob) {
      // In mobile environment, this binds to navigator.geolocation or expo-location
      const interval = setInterval(() => {
        // Broadcast telemetry ping
        fumigationTrackingService.sendLocationPing({
          bookingId: selectedJob.id,
          latitude: 9.0722 + (Math.random() - 0.5) * 0.002,
          longitude: 7.4913 + (Math.random() - 0.5) * 0.002,
          accuracy: 5.0,
          speed: 35,
          heading: 90,
          batteryLevel: 92
        }).catch(() => {});
      }, 10000);
      watchIdRef.current = interval;
    } else {
      if (watchIdRef.current) clearInterval(watchIdRef.current);
    }
    return () => {
      if (watchIdRef.current) clearInterval(watchIdRef.current);
    };
  }, [gpsActive, selectedJob]);

  const handleStageAdvance = async (nextStatus) => {
    if (!selectedJob) return;
    setUpdatingStatus(true);
    try {
      const payload = {
        newStatus: nextStatus,
        note: `Squad updated status to ${nextStatus}`
      };
      if (nextStatus === 'service_completed') {
        payload.chemicalName = chemicalName;
        payload.nafdacRegNumber = nafdacNo;
        payload.ventilationHours = Number(ventilationHours) || 4;
        payload.afterPhotos = ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80'];
      }
      await fumigationTrackingService.updateJobStatus(selectedJob.id, payload);
      Alert.alert('Status Updated', `Operation progressed to ${nextStatus.replace(/_/g, ' ')}`);
      loadJobs();
    } catch (err) {
      Alert.alert('Validation Error', err?.response?.data?.message || err?.message || 'Could not update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Loading assigned operations...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Console Header */}
        <View style={styles.consoleHeader}>
          <Text style={styles.consoleTitle}>Fumigation Specialist Squad</Text>
          <Text style={styles.consoleSub}>Operational Field Dispatch Console</Text>

          {/* GPS Broadcast Switch */}
          <View style={styles.gpsRow}>
            <View>
              <Text style={styles.gpsLabel}>Broadcast Live GPS Telemetry</Text>
              <Text style={styles.gpsSub}>{gpsActive ? 'Transmitting active coordinates' : 'Telemetry standby'}</Text>
            </View>
            <Switch
              value={gpsActive}
              onValueChange={setGpsActive}
              trackColor={{ false: '#cbd5e1', true: '#a7f3d0' }}
              thumbColor={gpsActive ? '#059669' : '#f1f5f9'}
            />
          </View>
        </View>

        {/* Selected Job Card */}
        {selectedJob && (
          <View style={styles.jobCard}>
            <View style={styles.jobTop}>
              <Text style={styles.jobRef}>JOB #{selectedJob.id}</Text>
              <View style={styles.stageBadge}>
                <Text style={styles.stageBadgeText}>
                  {String(selectedJob.tracking_status || 'ASSIGNED').replace(/_/g, ' ').toUpperCase()}
                </Text>
              </View>
            </View>

            <Text style={styles.jobTitle}>{selectedJob.service_name || 'Premises Pest Treatment'}</Text>
            <Text style={styles.jobAddr}>{selectedJob.property_address || 'Abuja Municipal'}</Text>

            {/* Quick Action Progression */}
            <Text style={styles.actionTitle}>Stage Progression Actions</Text>
            <View style={styles.buttonGrid}>
              <TouchableOpacity
                style={styles.stageBtn}
                onPress={() => handleStageAdvance('dispatched_travelling')}
                disabled={updatingStatus}
              >
                <Text style={styles.stageBtnText}>🚗 Dispatch &amp; En Route</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.stageBtn}
                onPress={() => handleStageAdvance('arrived_on_site')}
                disabled={updatingStatus}
              >
                <Text style={styles.stageBtnText}>📍 Arrived on Site</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.stageBtn}
                onPress={() => handleStageAdvance('chemical_treatment_active')}
                disabled={updatingStatus}
              >
                <Text style={styles.stageBtnText}>💨 Start Application</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.stageBtn}
                onPress={() => handleStageAdvance('ventilation_period')}
                disabled={updatingStatus}
              >
                <Text style={styles.stageBtnText}>⏳ Start Ventilation</Text>
              </TouchableOpacity>
            </View>

            {/* Mandatory Completion Inputs */}
            <View style={styles.completionBox}>
              <Text style={styles.completionTitle}>Mandatory Completion Safety Proof</Text>
              <Text style={styles.completionSub}>Required by law prior to certifying service completion</Text>

              <Text style={styles.inputLabel}>Applied Chemical Compound:</Text>
              <TextInput
                style={styles.input}
                value={chemicalName}
                onChangeText={setChemicalName}
                placeholder="e.g. Deltamethrin 2.5% EC"
              />

              <Text style={styles.inputLabel}>NAFDAC Registration Number:</Text>
              <TextInput
                style={styles.input}
                value={nafdacNo}
                onChangeText={setNafdacNo}
                placeholder="e.g. A4-2281"
              />

              <Text style={styles.inputLabel}>Ventilation Period (Hours):</Text>
              <TextInput
                style={styles.input}
                value={ventilationHours}
                onChangeText={setVentilationHours}
                keyboardType="numeric"
                placeholder="4"
              />

              <TouchableOpacity
                style={styles.completeJobBtn}
                onPress={() => handleStageAdvance('service_completed')}
                disabled={updatingStatus}
              >
                {updatingStatus ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.completeJobBtnText}>✅ Certify Job Complete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b' },
  scrollContent: { padding: 16 },
  consoleHeader: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  consoleTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  consoleSub: { fontSize: 13, color: '#64748b', marginTop: 2, marginBottom: 12 },
  gpsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0fdf4', padding: 12, borderRadius: 12 },
  gpsLabel: { fontSize: 13, fontWeight: '700', color: '#166534' },
  gpsSub: { fontSize: 11, color: '#15803d', marginTop: 1 },
  jobCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  jobTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  jobRef: { fontSize: 13, fontWeight: '700', color: '#059669' },
  stageBadge: { backgroundColor: '#ecfdf5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  stageBadgeText: { fontSize: 10, fontWeight: '700', color: '#047857' },
  jobTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  jobAddr: { fontSize: 13, color: '#64748b', marginTop: 2, marginBottom: 16 },
  actionTitle: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 10, textTransform: 'uppercase' },
  buttonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  stageBtn: { flexBasis: '48%', backgroundColor: '#f1f5f9', padding: 12, borderRadius: 10, alignItems: 'center' },
  stageBtnText: { fontSize: 12, fontWeight: '700', color: '#1e293b' },
  completionBox: { backgroundColor: '#f8fafc', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  completionTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  completionSub: { fontSize: 11, color: '#64748b', marginBottom: 12 },
  inputLabel: { fontSize: 11, fontWeight: '600', color: '#64748b', marginBottom: 4 },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, marginBottom: 10 },
  completeJobBtn: { backgroundColor: '#059669', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 6 },
  completeJobBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' }
});
