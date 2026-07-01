import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/Ionicons';
import { stateAdminService } from '../../services/stateAdminService';
import { AuthContext } from '../../context/AuthContext';
import { getErrorMessage, pickList } from '../../utils/http';

const StateAdminMigrationsScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [migrations, setMigrations] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');

  const stateId = user?.assigned_state || user?.state_id || user?.stateId;

  useEffect(() => {
    if (stateId) loadMigrations();
  }, [stateId, activeTab]);

  const loadMigrations = async () => {
    try {
      const response = await stateAdminService.getStatePropertyApprovals(stateId, {
        status: activeTab,
      });
      setMigrations(pickList(response, ['data', 'approvals', 'properties']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load migrations'),
      });
    }
  };

  const handleAction = async (propertyId, action) => {
    try {
      if (action === 'approve') {
        await stateAdminService.approveProperty(propertyId);
      } else {
        await stateAdminService.rejectProperty(propertyId, { reason: 'Rejected by admin' });
      }
      Toast.show({ type: 'success', text1: `Property ${action}d` });
      loadMigrations();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, `Could not ${action} property`),
      });
    }
  };

  const tabs = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ];

  return (
    <View style={styles.screen}>
      <View style={styles.tabRow}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={migrations}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="business-outline" size={20} color="#0f172a" />
              <Text style={styles.cardTitle}>{item.title || item.property_name || 'Property'}</Text>
            </View>
            <Text style={styles.cardOwner}>Owner: {item.owner_name || item.landlord_name || 'N/A'}</Text>
            <Text style={styles.cardMeta}>
              {item.city || ''} {item.state_name ? `| ${item.state_name}` : ''}
            </Text>
            <Text style={styles.cardMeta}>Status: {item.status || item.approval_status || 'pending'}</Text>

            {activeTab === 'pending' && (
              <View style={styles.actions}>
                <TouchableOpacity style={styles.approveBtn} onPress={() => handleAction(item.id, 'approve')}>
                  <Icon name="checkmark-circle-outline" size={18} color="#059669" />
                  <Text style={styles.approveText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => handleAction(item.id, 'reject')}>
                  <Icon name="close-circle-outline" size={18} color="#dc2626" />
                  <Text style={styles.rejectText}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No {activeTab} migrations.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  tabRow: { flexDirection: 'row', padding: 16, paddingBottom: 8, gap: 8 },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  tabActive: { backgroundColor: '#0284c7' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  tabTextActive: { color: '#ffffff' },
  list: { padding: 16, paddingBottom: 24 },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', flex: 1 },
  cardOwner: { color: '#475569', fontSize: 13, marginTop: 6 },
  cardMeta: { color: '#64748b', fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 10 },
  approveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rejectBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  approveText: { color: '#059669', fontWeight: '700' },
  rejectText: { color: '#dc2626', fontWeight: '700' },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 40 },
});

export default StateAdminMigrationsScreen;
