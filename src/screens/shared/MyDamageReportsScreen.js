import React, { useEffect, useLayoutEffect, useState } from 'react';
import {ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet
  TouchableOpacity,
  View,} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import api from '../../services/api';
import { colors, radius, typography } from '../../theme';
import { getErrorMessage, pickList } from '../../utils/http';

import AppText from '../../components/common/AppText';
const STATUS_CONFIG = {
  pending: { color: colors.blue, bg: '#EFF6FF', label: 'Pending' },
  resolved: { color: colors.success, bg: '#F0FBF6', label: 'Resolved' },
  rejected: { color: colors.danger, bg: '#FFF0EF', label: 'Rejected' },
  open: { color: colors.blue, bg: '#EFF6FF', label: 'Open' },
  in_review: { color: '#B46B00', bg: '#FFFBEB', label: 'In Review' },
  acknowledged: { color: colors.blue, bg: '#EFF6FF', label: 'Acknowledged' },
};

const getStatusStyle = (status) => {
  const key = String(status || 'pending').toLowerCase().replace(/\s+/g, '_');
  return STATUS_CONFIG[key] || STATUS_CONFIG.pending;
};

const formatDate = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(value);
  }
};

const truncate = (text, max = 80) => {
  const str = String(text || '');
  return str.length > max ? `${str.slice(0, max)}…` : str;
};

const MyDamageReportsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState([]);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadReports = async ({ refresh = false } = {}) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const response = await api.get('/damage-reports/my');
      setItems(pickList(response, ['data', 'reports']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Could not load damage reports',
        text2: getErrorMessage(error, 'Please check your connection and try again.'),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const renderReportCard = ({ item }) => {
    const status = getStatusStyle(item.status);

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate('PropertyDetail', { id: item.property_id })}
        style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.iconContainer}>
            <Icon name="warning-outline" size={20} color={colors.blue} />
          </View>
          <View style={styles.cardHeader}>
            <AppText style={styles.cardTitle} numberOfLines={1}>
              {item.property_name || 'Untitled Property'}
            </AppText>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <AppText style={[styles.statusText, { color: status.color }]}>{status.label}</AppText>
            </View>
          </View>
        </View>

        {item.description ? (
          <AppText style={styles.description} numberOfLines={2}>
            {truncate(item.description)}
          </AppText>
        ) : null}

        <View style={styles.metaRow}>
          <Icon name="calendar-outline" size={14} color={colors.muted} />
          <AppText style={styles.metaText}>{formatDate(item.created_at || item.date)}</AppText>
        </View>

        <View style={styles.cardArrow}>
          <Icon name="chevron-forward" size={17} color={colors.muted} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="arrow-back" size={22} color={colors.navy} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <AppText style={styles.eyebrow}>PROPERTY REPORTS</AppText>
          <AppText style={styles.title}>Damage reports</AppText>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        contentContainerStyle={[styles.list, !items.length && styles.emptyList]}
        data={items}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          !loading && items.length ? (
            <AppText style={styles.summary}>
              {items.length} {items.length === 1 ? 'report' : 'reports'} submitted
            </AppText>
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.blue} size="large" />
              <AppText style={styles.loadingText}>Loading your reports…</AppText>
            </View>
          ) : (
            <View style={styles.center}>
              <View style={styles.emptyIcon}>
                <Icon name="warning-outline" size={31} color={colors.blue} />
              </View>
              <AppText style={styles.emptyTitle}>No damage reports</AppText>
              <AppText style={styles.emptyText}>
                You have not filed any damage reports. If you notice damage in a property, you can submit a report from the property detail screen.
              </AppText>
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            colors={[colors.blue]}
            onRefresh={() => loadReports({ refresh: true })}
            refreshing={refreshing}
            tintColor={colors.blue}
          />
        }
        renderItem={renderReportCard}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.surface,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 21,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  headerCopy: {
    alignItems: 'center',
    flex: 1,
  },
  headerSpacer: {
    width: 42,
  },
  eyebrow: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 13,
    letterSpacing: 1.25,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 20,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  list: {
    padding: 16,
    paddingBottom: 30,
  },
  emptyList: {
    flexGrow: 1,
  },
  summary: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    marginBottom: 13,
  },
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 420,
    paddingHorizontal: 24,
  },
  loadingText: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 12,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 34,
    height: 68,
    justifyContent: 'center',
    width: 68,
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 20,
    marginTop: 18,
  },
  emptyText: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: '#FFF0EF',
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    marginRight: 12,
    width: 38,
  },
  cardHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  statusBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusText: {
    fontFamily: typography.bold,
    fontSize: 13,
    textTransform: 'uppercase',
  },
  description: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 10,
  },
  metaText: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginLeft: 7,
  },
  cardArrow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
});

export default MyDamageReportsScreen;
