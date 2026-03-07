import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { AuthContext } from '../../context/AuthContext';
import { dashboardService } from '../../services/dashboardService';
import { getErrorMessage, pickList, pickObject } from '../../utils/http';

const StatCard = ({ title, value, icon, onPress }) => (
  <TouchableOpacity style={styles.statCard} onPress={onPress}>
    <View>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value ?? 0}</Text>
    </View>
    <Icon name={icon} size={26} color="#0284c7" />
  </TouchableOpacity>
);

const DashboardScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [activities, setActivities] = useState([]);

  const isTenant = user?.user_type === 'tenant';

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [statsRes, activitiesRes] = await Promise.all([
        isTenant ? dashboardService.getTenantStats() : dashboardService.getLandlordStats(),
        isTenant
          ? dashboardService.getTenantRecentActivities()
          : dashboardService.getLandlordRecentActivities(),
      ]);

      setStats(pickObject(statsRes, ['data']) || {});
      setActivities(pickList(activitiesRes, ['data']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load dashboard'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [user?.user_type]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Welcome back, {user?.full_name || 'User'}</Text>
      <Text style={styles.subtitle}>Manage your properties</Text>

      {!user?.identity_verified && (
        <TouchableOpacity style={styles.alert} onPress={() => navigation.navigate('Profile')}>
          <Icon name="alert-circle-outline" size={20} color="#92400e" />
          <Text style={styles.alertText}>Identity verification is pending. Tap to complete it.</Text>
        </TouchableOpacity>
      )}

      <View style={styles.grid}>
        {isTenant ? (
          <>
            <StatCard
              title="Saved Properties"
              value={stats.saved_properties_count}
              icon="heart-outline"
              onPress={() => navigation.navigate('SavedProperties')}
            />
            <StatCard
              title="Unlocked Details"
              value={stats.unlocked_properties_count}
              icon="lock-open-outline"
              onPress={() => navigation.navigate('PropertyList')}
            />
            <StatCard
              title="Unread Messages"
              value={stats.unread_messages}
              icon="mail-unread-outline"
              onPress={() => navigation.navigate('Messages')}
            />
          </>
        ) : (
          <>
            <StatCard
              title="Total Properties"
              value={stats.total_properties}
              icon="home-outline"
              onPress={() => navigation.navigate('MyProperties')}
            />
            <StatCard
              title="Available"
              value={stats.available_properties}
              icon="checkmark-circle-outline"
              onPress={() => navigation.navigate('MyProperties')}
            />
            <StatCard
              title="Pending Applications"
              value={stats.pending_applications}
              icon="documents-outline"
              onPress={() => navigation.navigate('Applications')}
            />
          </>
        )}
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('PropertyList')}>
          <Text style={styles.quickTitle}>Browse Properties</Text>
          <Text style={styles.quickText}>Find listings and details</Text>
        </TouchableOpacity>

        {isTenant ? (
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('SavedProperties')}>
            <Text style={styles.quickTitle}>Saved Properties</Text>
            <Text style={styles.quickText}>Your shortlist</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('AddProperty')}>
            <Text style={styles.quickTitle}>Add Property</Text>
            <Text style={styles.quickText}>Create a new listing</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionTitle}>Recent Activities</Text>
      {activities.length === 0 ? (
        <Text style={styles.emptyText}>No recent activities.</Text>
      ) : (
        activities.map((item) => (
          <View key={`${item.type}-${item.id}`} style={styles.activityItem}>
            <Text style={styles.activityType}>{String(item.type || 'activity').toUpperCase()}</Text>
            <Text style={styles.activityText}>
              {item.property_title || item.message_text || 'Activity update'}
            </Text>
            <Text style={styles.activityDate}>
              {item.activity_date ? new Date(item.activity_date).toLocaleString() : ''}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 30 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  subtitle: { marginTop: 6, marginBottom: 14, color: '#64748b', textAlign: 'center' },
  alert: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  alertText: { color: '#78350f', flex: 1 },
  grid: { gap: 10 },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statTitle: { color: '#64748b', fontSize: 13 },
  statValue: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginTop: 4 },
  quickActions: { marginTop: 14, gap: 10 },
  quickBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
    padding: 12,
  },
  quickTitle: { color: '#1e40af', fontWeight: '700' },
  quickText: { marginTop: 2, color: '#475569', fontSize: 12 },
  sectionTitle: { marginTop: 18, marginBottom: 8, fontSize: 18, fontWeight: '800', color: '#0f172a' },
  emptyText: { color: '#64748b' },
  activityItem: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 8,
  },
  activityType: { color: '#0284c7', fontSize: 11, fontWeight: '700' },
  activityText: { marginTop: 4, color: '#0f172a', fontWeight: '600' },
  activityDate: { marginTop: 4, color: '#64748b', fontSize: 12 },
});

export default DashboardScreen;
