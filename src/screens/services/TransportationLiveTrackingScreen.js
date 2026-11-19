import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView
} from 'react-native';
import transportationTrackingService from '../../services/transportationTrackingService';

export default function TransportationLiveTrackingScreen({ route, navigation }) {
  const bookingId = route.params?.bookingId;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signingOff, setSigningOff] = useState(false);

  const fetchTracking = async () => {
    try {
      const res = await transportationTrackingService.getTrackingSummary(bookingId);
      setData(res);
    } catch (err) {
      console.warn('Failed to fetch transportation tracking:', err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();
    const interval = setInterval(fetchTracking, 12000);
    return () => clearInterval(interval);
  }, [bookingId]);

  const handleConfirmReceipt = async () => {
    setSigningOff(true);
    try {
      await transportationTrackingService.confirmSignoff(bookingId, {
        satisfied: true,
        rating: 5,
        note: 'Cargo and household items received in sound condition.'
      });
      Alert.alert('Delivery Verified', 'Thank you for confirming receipt of your items!');
      fetchTracking();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to confirm receipt');
    } finally {
      setSigningOff(false);
    }
  };

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.loadingText}>Connecting to transit vehicle telemetry...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <Text style={styles.headerRef}>TRIP #{bookingId}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>
                {String(data?.tracking_status || data?.booking_status || 'IN TRANSIT').replace(/_/g, ' ').toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.headerTitle}>{data?.service_name || 'Household Goods Transit'}</Text>
        </View>

        {/* Telemetry overview */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Live Movement Radar</Text>
          <View style={styles.telemetryRow}>
            <View style={styles.telemetryBox}>
              <Text style={styles.telemetryLabel}>ETA REMAINING</Text>
              <Text style={styles.telemetryValue}>{data?.estimates?.eta_minutes || 0} mins</Text>
            </View>
            <View style={styles.telemetryBox}>
              <Text style={styles.telemetryLabel}>DISTANCE</Text>
              <Text style={styles.telemetryValue}>{data?.estimates?.distance_km || 0} km</Text>
            </View>
            <View style={styles.telemetryBox}>
              <Text style={styles.telemetryLabel}>CURRENT SPEED</Text>
              <Text style={styles.telemetryValue}>{data?.current_location?.speed || 0} km/h</Text>
            </View>
          </View>

          {data?.current_location && (
            <View style={styles.gpsBanner}>
              <View style={styles.gpsDot} />
              <Text style={styles.gpsText}>
                Telemetry: {data.current_location.latitude.toFixed(4)}, {data.current_location.longitude.toFixed(4)} • Heading {data.current_location.heading || 0}°
              </Text>
            </View>
          )}
        </View>

        {/* Route Waypoints */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Transit Route</Text>
          <View style={styles.waypointRow}>
            <Text style={styles.waypointIcon}>🟢</Text>
            <View style={styles.waypointInfo}>
              <Text style={styles.waypointLabel}>Pickup Point</Text>
              <Text style={styles.waypointAddress}>{data?.pickup_address || 'Origin location'}</Text>
            </View>
          </View>
          <View style={styles.waypointDivider} />
          <View style={styles.waypointRow}>
            <Text style={styles.waypointIcon}>🏁</Text>
            <View style={styles.waypointInfo}>
              <Text style={styles.waypointLabel}>Destination Drop-off</Text>
              <Text style={styles.waypointAddress}>{data?.destination_address || 'Destination location'}</Text>
            </View>
          </View>
        </View>

        {/* Assigned Driver & Vehicle */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Driver &amp; Carrier Vehicle</Text>
          <View style={styles.driverRow}>
            <View style={styles.driverAvatar}>
              <Text style={styles.driverEmoji}>🚚</Text>
            </View>
            <View style={styles.driverDetails}>
              <Text style={styles.driverName}>{data?.driver?.name || 'Assigned Driver'}</Text>
              <Text style={styles.vehiclePlate}>Plate: {data?.driver?.vehicle_number || 'ABJ-894-XY'}</Text>
              <Text style={styles.driverPhone}>{data?.driver?.phone || '+234 803 123 4567'}</Text>
            </View>
          </View>
        </View>

        {/* Delivery Signoff */}
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={handleConfirmReceipt}
          disabled={signingOff}
        >
          {signingOff ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.confirmBtnText}>📦 Confirm Safe Cargo Receipt</Text>
          )}
        </TouchableOpacity>
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
  headerTop: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  headerRef: { fontSize: 13, fontWeight: '700', color: '#0284c7' },
  statusBadge: { backgroundColor: '#f0f9ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: { fontSize: 13, fontWeight: '700', color: '#0369a1' ,lineHeight:18},
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  telemetryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  telemetryBox: { flex: 1, backgroundColor: '#f8fafc', padding: 12, borderRadius: 10, alignItems: 'center' },
  telemetryLabel: { fontSize: 13, fontWeight: '700', color: '#586A86' ,lineHeight:18},
  telemetryValue: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginTop: 4 },
  gpsBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f9ff', padding: 10, borderRadius: 8, marginTop: 12 },
  gpsDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#0284c7', marginRight: 8 },
  gpsText: { fontSize: 13, color: '#0369a1', fontWeight: '600' ,lineHeight:18},
  waypointRow: { flexDirection: 'row', alignItems: 'flex-start' },
  waypointIcon: { fontSize: 16, marginRight: 10, marginTop: 2 },
  waypointInfo: { flex: 1 },
  waypointLabel: { fontSize: 13, fontWeight: '700', color: '#586A86', textTransform: 'uppercase' ,lineHeight:18},
  waypointAddress: { fontSize: 13, color: '#1e293b', marginTop: 2 },
  waypointDivider: { height: 16, width: 2, backgroundColor: '#cbd5e1', marginLeft: 8, marginVertical: 4 },
  driverRow: { flexDirection: 'row', alignItems: 'center' },
  driverAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  driverEmoji: { fontSize: 22 },
  driverDetails: { flex: 1 },
  driverName: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  vehiclePlate: { fontSize: 13, color: '#64748b' ,lineHeight:18},
  driverPhone: { fontSize: 13, color: '#0284c7', marginTop: 2 ,lineHeight:18},
  confirmBtn: { backgroundColor: '#0284c7', padding: 16, borderRadius: 14, alignItems: 'center', marginVertical: 8 },
  confirmBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' }
});
