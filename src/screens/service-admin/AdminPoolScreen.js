import React, { useCallback, useLayoutEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { supportService } from '../../services/supportService';
import { colors, spacing, typography } from '../../theme';
import { getErrorMessage } from '../../utils/http';

const AdminPoolScreen = ({ navigation }) => {
  const [pool, setPool] = useState([]);
  const [loading, setLoading] = useState(true);

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

  useState(() => { load(); });

  const promote = async (userId) => {
    try {
      const res = await supportService.promoteToLead(userId);
      if (res.success) {
        Toast.show({ type: 'success', text1: 'Promoted' });
        load();
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed', text2: getErrorMessage(err) });
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.name}>{item.full_name}</Text>
        <Text style={styles.meta}>
          {item.user_type} &middot; {item.state}{item.lga ? ` / ${item.lga}` : ''}
        </Text>
      </View>
      <View style={styles.stats}>
        <Text style={styles.count}>{item.open_tickets}</Text>
        <Text style={styles.label}>open</Text>
      </View>
      {item.is_lead ? (
        <View style={styles.leadBadge}>
          <Text style={styles.leadText}>Lead</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.promoteBtn} onPress={() => promote(item.id)}>
          <Text style={styles.promoteText}>Make Lead</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Pool</Text>
      <TouchableOpacity onPress={load} style={styles.refresh}><Text>Refresh</Text></TouchableOpacity>
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
  title: { fontSize: 22, fontWeight: '700', color: '#1E293B', marginBottom: spacing.sm },
  refresh: { alignSelf: 'flex-end', marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: '#E2E8F0' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  meta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  stats: { alignItems: 'center', marginHorizontal: spacing.md },
  count: { fontSize: 18, fontWeight: '700', color: '#475569' },
  label: { fontSize: 10, color: '#94A3B8' },
  leadBadge: { backgroundColor: '#FEF3C7', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  leadText: { fontSize: 12, fontWeight: '600', color: '#92400E' },
  promoteBtn: { backgroundColor: '#EEF2FF', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  promoteText: { fontSize: 12, fontWeight: '600', color: '#4338CA' },
  empty: { textAlign: 'center', color: '#94A3B8', marginTop: 60 },
});

export default AdminPoolScreen;
