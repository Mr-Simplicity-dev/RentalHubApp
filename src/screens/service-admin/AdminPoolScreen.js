import React, { useCallback, useContext, useEffect, useLayoutEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { AuthContext } from '../../context/AuthContext';
import { supportService } from '../../services/supportService';
import { colors, spacing, typography } from '../../theme';
import { getErrorMessage } from '../../utils/http';

const AdminPoolScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [pool, setPool] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const canManageLeads = ['super_admin', 'super_support_admin'].includes(user?.user_type);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await supportService.getAdminPool();
      if (res.success) setPool(res.data || []);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed', text2: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setLead = async (item) => {
    setUpdatingId(item.id);
    try {
      const nextLeadStatus = !item.is_lead;
      const res = await supportService.setLeadStatus(item.id, nextLeadStatus);
      if (res.success) {
        Toast.show({
          type: 'success',
          text1: nextLeadStatus ? 'Lead assigned' : 'Lead role removed',
        });
        await load();
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed', text2: getErrorMessage(err) });
    } finally {
      setUpdatingId(null);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.name}>{item.full_name}</Text>
        <Text style={styles.meta}>
          {item.user_type} · {item.assigned_state || 'No state'}
          {item.assigned_city ? ` / ${item.assigned_city}` : ''}
        </Text>
      </View>
      <View style={styles.stats}>
        <Text style={styles.count}>{item.open_tickets}</Text>
        <Text style={styles.label}>open</Text>
      </View>
      {!canManageLeads && item.is_lead ? (
        <View style={styles.leadBadge}>
          <Text style={styles.leadText}>Lead</Text>
        </View>
      ) : canManageLeads ? (
        <TouchableOpacity
          disabled={updatingId === item.id}
          style={[styles.promoteBtn, item.is_lead && styles.demoteBtn]}
          onPress={() => setLead(item)}
        >
          <Text style={[styles.promoteText, item.is_lead && styles.demoteText]}>
            {updatingId === item.id ? 'Saving…' : item.is_lead ? 'Remove Lead' : 'Make Lead'}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Pool</Text>
      <TouchableOpacity onPress={load} style={styles.refresh}>
        <Text style={styles.refreshText}>Refresh</Text>
      </TouchableOpacity>
      <FlatList
        data={pool}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={<Text style={styles.empty}>No support admins found</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: spacing.md },
  title: { fontFamily: typography.bold, fontSize: 22, color: '#1E293B', marginBottom: spacing.sm },
  refresh: { alignSelf: 'flex-end', marginBottom: spacing.sm },
  refreshText: { color: colors.blue, fontFamily: typography.semibold, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: '#E2E8F0' },
  info: { flex: 1 },
  name: { fontFamily: typography.semibold, fontSize: 15, color: '#1E293B' },
  meta: { fontFamily: typography.regular, fontSize: 12, color: '#64748B', marginTop: 2 },
  stats: { alignItems: 'center', marginHorizontal: spacing.md },
  count: { fontFamily: typography.bold, fontSize: 18, color: '#475569' },
  label: { fontFamily: typography.regular, fontSize: 10, color: '#94A3B8' },
  leadBadge: { backgroundColor: '#FEF3C7', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  leadText: { fontFamily: typography.semibold, fontSize: 12, color: '#92400E' },
  promoteBtn: { backgroundColor: '#EEF2FF', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  promoteText: { fontFamily: typography.semibold, fontSize: 12, color: '#4338CA' },
  demoteBtn: { backgroundColor: '#FFF7ED' },
  demoteText: { color: '#C2410C' },
  empty: { fontFamily: typography.regular, textAlign: 'center', color: '#94A3B8', marginTop: 60 },
});

export default AdminPoolScreen;
