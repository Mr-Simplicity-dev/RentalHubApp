import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useCallback, useContext, useEffect, useLayoutEffect, useState } from 'react';
import {FlatList, StyleSheet, TouchableOpacity, View} from 'react-native';
import Toast from 'react-native-toast-message';
import { AuthContext } from '../../context/AuthContext';
import { supportService } from '../../services/supportService';
import { colors, spacing, typography, typeScale } from '../../theme';
import { getErrorMessage } from '../../utils/http';

import AppText from '../../components/common/AppText';
const AdminPoolScreen = ({ navigation }) => {
  const interfaceLanguage = useInterfaceLanguage();
  const { user } = useContext(AuthContext);
  const [pool, setPool] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const canManageLeads = ['super_admin', 'super_support_admin'].includes(user?.user_type);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: navigation.canGoBack() });
  }, [navigation, interfaceLanguage]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await supportService.getAdminPool();
      if (res.success) setPool(res.data || []);
    } catch (err) {
      Toast.show({ type: 'error', text1: ui("Failed"), text2: getErrorMessage(err) });
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
          text1: nextLeadStatus ? ui("Lead assigned") : ui("Lead role removed"),
        });
        await load();
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: ui("Failed"), text2: getErrorMessage(err) });
    } finally {
      setUpdatingId(null);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <View style={styles.info}>
        <AppText style={styles.name}>{item.full_name}</AppText>
        <AppText style={styles.meta}>
          {item.user_type} · {item.assigned_state || 'No state'}
          {item.assigned_city ? ui(" / {value0}", {value0: (item.assigned_city)}) : ''}
        </AppText>
      </View>
      <View style={styles.stats}>
        <AppText style={styles.count}>{item.open_tickets}</AppText>
        <AppText style={styles.label}>{ui("open")}</AppText>
      </View>
      {!canManageLeads && item.is_lead ? (
        <View style={styles.leadBadge}>
          <AppText style={styles.leadText}>{ui("Lead")}</AppText>
        </View>
      ) : canManageLeads ? (
        <TouchableOpacity
          disabled={updatingId === item.id}
          style={[styles.promoteBtn, item.is_lead && styles.demoteBtn]}
          onPress={() => setLead(item)}
        >
          <AppText style={[styles.promoteText, item.is_lead && styles.demoteText]}>
            {updatingId === item.id ? 'Saving…' : item.is_lead ? 'Remove Lead' : 'Make Lead'}
          </AppText>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <AppText style={styles.title}>{ui("Admin Pool")}</AppText>
      <TouchableOpacity onPress={load} style={styles.refresh}>
        <AppText style={styles.refreshText}>{ui("Refresh")}</AppText>
      </TouchableOpacity>
      <FlatList
        data={pool}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={<AppText style={styles.empty}>{ui("No support admins found")}</AppText>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: spacing.md },
  title: { fontFamily: typography.semibold, fontSize: typeScale.xl, lineHeight: 32, color: '#1E293B', marginBottom: spacing.sm },
  refresh: { alignSelf: 'flex-end', marginBottom: spacing.sm },
  refreshText: { color: colors.blue, fontFamily: typography.semibold, fontSize: typeScale.xs, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: '#E2E8F0' },
  info: { flex: 1 },
  name: { fontFamily: typography.semibold, fontSize: typeScale.base, lineHeight: 24, color: '#1E293B' },
  meta: { fontFamily: typography.regular, fontSize: typeScale.xs, lineHeight: 18, color: '#64748B', marginTop: 2 },
  stats: { alignItems: 'center', marginHorizontal: spacing.md },
  count: { fontFamily: typography.bold, fontSize: typeScale.md, lineHeight: 26, color: '#475569' },
  label: { fontFamily: typography.regular, fontSize: typeScale.xs, lineHeight: 18, color: '#94A3B8' },
  leadBadge: { backgroundColor: '#FEF3C7', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  leadText: { fontFamily: typography.semibold, fontSize: typeScale.xs, lineHeight: 18, color: '#92400E' },
  promoteBtn: { backgroundColor: '#EEF2FF', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  promoteText: { fontFamily: typography.semibold, fontSize: typeScale.xs, lineHeight: 18, color: '#4338CA' },
  demoteBtn: { backgroundColor: '#FFF7ED' },
  demoteText: { color: '#C2410C' },
  empty: { fontFamily: typography.regular, textAlign: 'center', color: '#94A3B8', marginTop: 60 },
});

export default AdminPoolScreen;
