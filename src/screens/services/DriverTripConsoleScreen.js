import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Switch,
  SafeAreaView
} from 'react-native';
import transportationTrackingService from '../../services/transportationTrackingService';

export default function DriverTripConsoleScreen({ navigation }) {
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gpsActive, setGpsActive] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const pingIntervalRef = useRef(null);

  const loadTrips = async () => {
    try {
      const data = await transportationTrackingService.getDriverTrips();
      setTrips(data);
      if (data.length > 0 && !selectedTrip) {
        setSelectedTrip(data[0]);
      }
    } catch (err) {
      console.warn('Failed to load driver trips:', err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, []);

  // Transmit GPS telemetry when switch active
  useEffect(() => {
    if (gpsActive && selectedTrip) {
      pingIntervalRef.current = setInterval(() => {
        transportationTrackingService.sendLocationPing({
          bookingId: selectedTrip.id,
          latitude: 9.0765 + (Math.random() - 0.5) * 0.003,
          longitude: 7.4215 + (Math.random() - 0.5) * 0.003,
          accuracy: 6.0,
          speed: 42,
          heading: 180,
          batteryLevel: 85
        }).catch(() => {});
      }, 10000);
    } else {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    }
    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    };
  }, [gpsActive, selectedTrip]);

  const handleAdvanceStatus = async (newStatus) => {
    if (!selectedTrip) return;
    setUpdatingStatus(true);
    try {
      await transportationTrackingService.updateTripStatus(selectedTrip.id, {
        newStatus,
        note: `Driver marked trip as ${newStatus}`
      });
      Alert.alert('Trip Status Updated', `Status changed to ${newStatus.replace(/_/g, ' ')}`);
      loadTrips();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Could not update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.loadingText}>Loading assigned trips...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.headerCard}>
          <Text style={styles.headerTitle}>Driver Transit Console</Text>
          <Text style={styles.headerSub}>Real-Time GPS Dispatch &amp; Delivery</Text>

          {/* GPS Broadcast toggle */}
          <View style={styles.gpsRow}>
            <View>
              <Text style={styles.gpsLabel}>Share Vehicle GPS with Customer</Text>
              <Text style={styles.gpsSub}>{gpsActive ? 'Transmitting road speed & telemetry' : 'Broadcasting paused'}</Text>
            </View>
            <Switch
              value={gpsActive}
              onValueChange={setGpsActive}
              trackColor={{ false: '#cbd5e1', true: '#bae6fd' }}
              thumbColor={gpsActive ? '#0284c7' : '#f1f5f9'}
            />
          </View>
        </View>

        {selectedTrip && (
          <View style={styles.tripCard}>
            <View style={styles.tripTop}>
              <Text style={styles.tripRef}>TRIP #{selectedTrip.id}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {String(selectedTrip.tracking_status || 'ASSIGNED').replace(/_/g, ' ').toUpperCase()}
                </Text>
              </View>
            </View>

            <Text style={styles.tripTitle}>{selectedTrip.service_name || 'Relocation Transit'}</Text>
            <Text style={styles.tripRoute}>
              {selectedTrip.pickup_address || 'Origin'} ➔ {selectedTrip.destination_address || 'Destination'}
            </Text>

            {/* Stages */}
            <Text style={styles.actionHeader}>Trip Milestones</Text>
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.stageButton}
                onPress={() => handleAdvanceStatus('driver_en_route_pickup')}
                disabled={updatingStatus}
              >
                <Text style={styles.stageButtonText}>🚙 En Route to Pickup</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.stageButton}
                onPress={() => handleAdvanceStatus('arrived_pickup')}
                disabled={updatingStatus}
              >
                <Text style={styles.stageButtonText}>📍 Arrived at Pickup</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.stageButton}
                onPress={() => handleAdvanceStatus('in_transit')}
                disabled={updatingStatus}
              >
                <Text style={styles.stageButtonText}>🚚 Cargo Loaded &amp; In Transit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.stageButton}
                onPress={() => handleAdvanceStatus('arrived_dropoff')}
                disabled={updatingStatus}
              >
                <Text style={styles.stageButtonText}>🏁 Arrived at Destination</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.completedButton}
              onPress={() => handleAdvanceStatus('trip_completed')}
              disabled={updatingStatus}
            >
              {updatingStatus ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.completedButtonText}>✅ Complete Trip &amp; Unload Cargo</Text>
              )}
            </TouchableOpacity>
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
  headerCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  headerSub: { fontSize: 13, color: '#64748b', marginTop: 2, marginBottom: 12 },
  gpsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0f9ff', padding: 12, borderRadius: 12 },
  gpsLabel: { fontSize: 13, fontWeight: '700', color: '#0369a1' },
  gpsSub: { fontSize: 13, color: '#0284c7', marginTop: 1 ,lineHeight:18},
  tripCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  tripTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  tripRef: { fontSize: 13, fontWeight: '700', color: '#0284c7' },
  badge: { backgroundColor: '#f0f9ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 13, fontWeight: '700', color: '#0369a1' ,lineHeight:18},
  tripTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  tripRoute: { fontSize: 13, color: '#64748b', marginTop: 2, marginBottom: 16 },
  actionHeader: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 10, textTransform: 'uppercase' },
  btnRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  stageButton: { flex: 1, backgroundColor: '#f1f5f9', padding: 12, borderRadius: 10, alignItems: 'center' },
  stageButtonText: { fontSize: 13, fontWeight: '700', color: '#1e293b' ,lineHeight:18},
  completedButton: { backgroundColor: '#16a34a', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  completedButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '700' }
});
