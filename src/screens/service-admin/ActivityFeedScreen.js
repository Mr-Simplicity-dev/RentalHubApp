import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useCallback, useLayoutEffect, useState } from 'react';
import {FlatList, StyleSheet, TouchableOpacity, View} from 'react-native';
import Toast from 'react-native-toast-message';
import { supportService } from '../../services/supportService';
import { colors, spacing, typography, typeScale } from '../../theme';
import { getErrorMessage } from '../../utils/http';
import { formatDisplayValue } from '../../utils/display';

import AppText from '../../components/common/AppText';
const ActivityFeedScreen = ({ navigation, route }) => {
  const interfaceLanguage = useInterfaceLanguage();
  const allMode = route?.params?.all === true;
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: navigation.canGoBack() });
  }, [navigation, interfaceLanguage]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fn = allMode ? supportService.getAllActivity : supportService.getActivity;
      const res = await fn();
      if (res.success) setLogs(res.data || []);
    } catch (err) {
      Toast.show({ type: 'error', text1: ui("Failed"), text2: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [allMode]);

  useState(() => { load(); });

  const formatDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const actionColor = (action) => {
    if (action?.includes('resolved')) return '#059669';
    if (action?.includes('assigned')) return '#2563EB';
    if (action?.includes('created') || action?.includes('promote')) return '#7C3AED';
    return '#475569';
  };

  const renderItem = ({ item }) => (
    <View style={styles.log}>
      <View style={[styles.dot, { backgroundColor: actionColor(item.action) }]} />
      <View style={styles.body}>
        <AppText style={styles.action}>{formatDisplayValue(item.action).replace(/_/g, ' ')}</AppText>
        <AppText style={styles.actor}>{ui("by")}{item.user_name || ui("System")} ({item.user_type})
        </AppText>
        {item.state && <AppText style={styles.location}>{item.state}{item.lga ? ui(" / {value0}", {value0: (item.lga)}) : ''}</AppText>}
        {item.metadata && <AppText style={styles.meta}>{JSON.stringify(item.metadata)}</AppText>}
      </View>
      <AppText style={styles.time}>{formatDate(item.created_at)}</AppText>
    </View>
  );

  return (
    <View style={styles.container}>
      <AppText style={styles.title}>{allMode ? ui("All Activity") : ui("Activity Feed")}</AppText>
      <TouchableOpacity onPress={load} style={styles.refresh}><AppText>{ui("Refresh")}</AppText></TouchableOpacity>
      <FlatList
        data={logs}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={<AppText style={styles.empty}>{ui("No activity logs found")}</AppText>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: spacing.md },
  title: { fontSize: typeScale.xl, lineHeight: 32, fontWeight: '700', color: '#1E293B', marginBottom: spacing.sm },
  refresh: { alignSelf: 'flex-end', marginBottom: spacing.sm },
  log: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFF', borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: '#E2E8F0' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 6, marginRight: spacing.sm },
  body: { flex: 1 },
  action: { fontSize: typeScale.sm, lineHeight: 20, fontWeight: '600', color: '#1E293B', textTransform: 'capitalize' },
  actor: { fontSize: typeScale.xs, lineHeight: 18, color: '#64748B', marginTop: 2 },
  location: { fontSize: typeScale.xs, lineHeight: 18, color: '#94A3B8', marginTop: 1 },
  meta: { fontSize: 13, color: '#94A3B8', marginTop: 2, fontFamily: 'monospace' },
  time: { fontSize: typeScale.xs, lineHeight: 18, color: '#94A3B8', marginLeft: spacing.sm },
  empty: { textAlign: 'center', color: '#94A3B8', marginTop: 60 },
});

export default ActivityFeedScreen;
