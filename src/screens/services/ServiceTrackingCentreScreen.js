import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import serviceTrackingService from '../../services/serviceTrackingService';

export default function ServiceTrackingCentreScreen({ navigation }) {
  const [filter, setFilter] = useState('all');
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadServices = useCallback(async () => {
    try {
      const data = await serviceTrackingService.getMyServices(filter);
      setServices(data);
    } catch (err) {
      console.warn('Failed to load tracking services:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    loadServices();
  }, [loadServices]);

  const onRefresh = () => {
    setRefreshing(true);
    loadServices();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'in_progress':
      case 'dispatched_travelling':
      case 'chemical_treatment_active':
        return '#0284c7';
      case 'completed':
      case 'service_completed':
        return '#16a34a';
      case 'ventilation_period':
        return '#ea580c';
      case 'incident_delayed':
        return '#dc2626';
      default:
        return '#ca8a04';
    }
  };

  const openTrackingDetail = (item) => {
    if (item.service_type === 'fumigation') {
      navigation.navigate('FumigationLiveTracking', { bookingId: item.booking_id });
    } else {
      navigation.navigate('TransportationLiveTracking', { bookingId: item.booking_id });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Service Tracking Centre</Text>
        <Text style={styles.subtitle}>Real-time movement, ETA &amp; safety protocols</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabContainer}>
        {['all', 'transportation', 'fumigation'].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setFilter(tab)}
            style={[styles.tabButton, filter === tab && styles.tabButtonActive]}
          >
            <Text style={[styles.tabText, filter === tab && styles.tabTextActive]}>
              {tab === 'all' ? 'All Services' : tab === 'transportation' ? '🚚 Relocation' : '💨 Fumigation'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.loadingText}>Fetching active trips &amp; telemetry...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0284c7']} />}
        >
          {services.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🛰️</Text>
              <Text style={styles.emptyTitle}>No Active Services Found</Text>
              <Text style={styles.emptySubtitle}>
                {filter === 'all'
                  ? 'Book a relocation trip or professional fumigation session to track live here.'
                  : `No ${filter} requests currently active.`}
              </Text>
            </View>
          ) : (
            services.map((item) => (
              <TouchableOpacity
                key={`${item.service_type}-${item.booking_id}`}
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => openTrackingDetail(item)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.badgeRow}>
                    <View style={[styles.typeBadge, { backgroundColor: item.service_type === 'fumigation' ? '#ecfdf5' : '#f0f9ff' }]}>
                      <Text style={[styles.typeBadgeText, { color: item.service_type === 'fumigation' ? '#047857' : '#0369a1' }]}>
                        {item.service_type === 'fumigation' ? '💨 FUMIGATION' : '🚚 LOGISTICS'}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.tracking_status)}15` }]}>
                      <Text style={[styles.statusBadgeText, { color: getStatusColor(item.tracking_status) }]}>
                        {String(item.tracking_status || item.booking_status).replace(/_/g, ' ').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.referenceText}>ARH-#{item.booking_id}</Text>
                </View>

                <Text style={styles.serviceName}>{item.service_name}</Text>

                {/* Team / Driver info */}
                <View style={styles.personRow}>
                  <Text style={styles.personEmoji}>{item.service_type === 'fumigation' ? '👨‍🔬' : '👨‍✈️'}</Text>
                  <View style={styles.personInfo}>
                    <Text style={styles.personName}>{item.driver_name || item.team_name || 'Assigned Crew'}</Text>
                    <Text style={styles.personPhone}>{item.driver_phone || item.team_phone || 'Contact via platform'}</Text>
                  </View>
                </View>

                {/* Destination */}
                <View style={styles.locationContainer}>
                  <Text style={styles.locationLabel}>Service Destination:</Text>
                  <Text style={styles.locationAddress} numberOfLines={2}>
                    {item.destination_address || item.property_address || 'Property location'}
                  </Text>
                </View>

                {/* Tracking Action Button */}
                <View style={styles.actionRow}>
                  <View style={styles.liveIndicator}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>GPS Active</Text>
                  </View>
                  <View style={styles.openButton}>
                    <Text style={styles.openButtonText}>Track Live ➔</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tabButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, marginRight: 8, backgroundColor: '#f1f5f9' },
  tabButtonActive: { backgroundColor: '#0284c7' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  tabTextActive: { color: '#ffffff' },
  scrollContent: { padding: 16 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b' },
  emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
  cardHeader: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', maxWidth: '100%', gap: 6 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeBadgeText: { fontSize: 13, fontWeight: '700' ,lineHeight:18},
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 13, fontWeight: '700' ,lineHeight:18},
  referenceText: { fontSize: 13, fontWeight: '600', color: '#586A86' ,lineHeight:18},
  serviceName: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  personRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 10, borderRadius: 10, marginBottom: 12 },
  personEmoji: { fontSize: 24, marginRight: 10 },
  personInfo: { flex: 1 },
  personName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  personPhone: { fontSize: 13, color: '#64748b', marginTop: 1 ,lineHeight:18},
  locationContainer: { marginBottom: 12 },
  locationLabel: { fontSize: 13, fontWeight: '600', color: '#586A86', textTransform: 'uppercase' ,lineHeight:18},
  locationAddress: { fontSize: 13, color: '#334155', marginTop: 2 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e', marginRight: 6 },
  liveText: { fontSize: 13, color: '#15803d', fontWeight: '600' ,lineHeight:18},
  openButton: { backgroundColor: '#0284c7', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  openButtonText: { fontSize: 13, fontWeight: '700', color: '#ffffff' ,lineHeight:18}
});
