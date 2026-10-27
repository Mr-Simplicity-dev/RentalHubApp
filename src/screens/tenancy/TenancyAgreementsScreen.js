import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { AuthContext } from '../../context/AuthContext';
import {
  tenancyAgreementService,
  tenancyAgreementStatusVisual,
  TENANCY_AGREEMENT_STATUS_LABELS,
} from '../../services/tenancyAgreementService';
import { colors, radius, typography, typeScale } from '../../theme';
import { getErrorMessage, pickList } from '../../utils/http';

import AppText from '../../components/common/AppText';

const ALL_FILTERS = [
  { value: 'all', get "label"() { return ui("All"); } },
  { value: 'PENDING_LANDLORD_REVIEW', get "label"() { return ui("Landlord review"); } },
  { value: 'PENDING_LANDLORD_SIGNATURE', get "label"() { return ui("Landlord signature"); } },
  { value: 'PENDING_TENANT_REVIEW', get "label"() { return ui("Tenant review"); } },
  { value: 'PENDING_TENANT_SIGNATURE', get "label"() { return ui("Tenant signature"); } },
  { value: 'FULLY_EXECUTED', get "label"() { return ui("Executed"); } },
];

const getFiltersForRole = (role) => {
  if (role === 'landlord') {
    return [
      { value: 'all', label: ui("All") },
      { value: 'PENDING_LANDLORD_REVIEW', label: ui("Landlord review") },
      { value: 'PENDING_LANDLORD_SIGNATURE', label: ui("Landlord signature") },
      { value: 'FULLY_EXECUTED', label: ui("Executed") },
    ];
  }
  if (role === 'tenant') {
    return [
      { value: 'all', label: ui("All") },
      { value: 'PENDING_TENANT_REVIEW', label: ui("Tenant review") },
      { value: 'PENDING_TENANT_SIGNATURE', label: ui("Tenant signature") },
      { value: 'FULLY_EXECUTED', label: ui("Executed") },
    ];
  }
  return ALL_FILTERS;
};

const needsAction = (agreement, role) => {
  if (role === 'landlord') {
    return ['PENDING_LANDLORD_REVIEW', 'PENDING_LANDLORD_SIGNATURE'].includes(agreement.status);
  }
  if (role === 'tenant') {
    return ['PENDING_TENANT_REVIEW', 'PENDING_TENANT_SIGNATURE'].includes(agreement.status);
  }
  return false;
};

const TenancyAgreementsScreen = ({ navigation }) => {
  const interfaceLanguage = useInterfaceLanguage();
  const { user } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const role = user?.user_type === 'landlord' ? 'landlord' : user?.user_type === 'tenant' ? 'tenant' : null;

  const filters = useMemo(() => getFiltersForRole(role), [role, interfaceLanguage]);

  const load = async ({ refresh = false } = {}) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const response = await tenancyAgreementService.list();
      setItems(pickList(response, ['data']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Could not load agreements"),
        text2: getErrorMessage(error, ui("Please try again.")),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const actionCount = useMemo(
    () => items.filter((agreement) => needsAction(agreement, user?.user_type)).length,
    [items, user, interfaceLanguage]
  );

  const visibleItems = useMemo(
    () => (filter === 'all' ? items : items.filter((agreement) => agreement.status === filter)),
    [filter, items, interfaceLanguage]
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <AppText style={styles.eyebrow}>{ui("TENANCY")}</AppText>
          <AppText style={styles.title}>{ui("My tenancy agreements")}</AppText>
        </View>
        <View style={styles.headerIcon}>
          <Icon name="document-text-outline" size={22} color={colors.blue} />
        </View>
      </View>

      <FlatList
        contentContainerStyle={[styles.list, !visibleItems.length && styles.emptyList]}
        data={visibleItems}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          <>
            {actionCount > 0 ? (
              <View style={styles.actionBanner}>
                <Icon name="alert-circle" size={18} color="#B46B00" />
                <AppText style={styles.actionBannerText}>
                  {actionCount}{ui(" agreement")}{actionCount > 1 ? ui("s") : ''}{ui("awaiting your action")}</AppText>
              </View>
            ) : null}
            <View style={styles.filterRow}>
              {filters.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setFilter(option.value)}
                  style={[styles.filterChip, filter === option.value && styles.filterChipActive]}>
                  <AppText style={[styles.filterText, filter === option.value && styles.filterTextActive]}>
                    {option.label}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.blue} size="large" />
              <AppText style={styles.loadingText}>{ui("Loading agreements…")}</AppText>
            </View>
          ) : (
            <View style={styles.center}>
              <View style={styles.emptyIcon}>
                <Icon name="document-text-outline" size={31} color={colors.blue} />
              </View>
              <AppText style={styles.emptyTitle}>{ui("No tenancy agreements yet")}</AppText>
              <AppText style={styles.emptyText}>{ui("When a landlord approves an application, the tenancy agreement will appear here for review and signature.")}</AppText>
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            colors={[colors.blue]}
            onRefresh={() => load({ refresh: true })}
            refreshing={refreshing}
            tintColor={colors.blue}
          />
        }
        renderItem={({ item }) => {
          const visual = tenancyAgreementStatusVisual(item.status);
          const action = needsAction(item, user?.user_type);
          return (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate('TenancyAgreementDetail', { id: item.id })}
              style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.statusIcon, { backgroundColor: visual.bg }]}>
                  <Icon name={visual.icon} size={20} color={visual.color} />
                </View>
                <View style={styles.cardHeading}>
                  <AppText style={styles.cardTitle} numberOfLines={2}>
                    {item.property_title || ui("Property")}
                  </AppText>
                  <AppText style={styles.cardMeta}>{TENANCY_AGREEMENT_STATUS_LABELS[item.status] || item.status}</AppText>
                </View>
                {action ? (
                  <View style={styles.actionPill}>
                    <AppText style={styles.actionPillText}>{ui("Action")}</AppText>
                  </View>
                ) : null}
              </View>
              <View style={styles.detailRow}>
                <Icon name="home-outline" size={14} color={colors.muted} />
                <AppText style={styles.detailText} numberOfLines={1}>
                  {item.full_address || 'Address unavailable'}
                </AppText>
              </View>
              <View style={styles.detailRow}>
                <Icon name="layers-outline" size={14} color={colors.muted} />
                <AppText style={styles.detailText}>{ui("Version")}{item.current_version}{ui(" · Created ")}{item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
                </AppText>
              </View>
            </TouchableOpacity>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.surface, flex: 1 },
  header: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  eyebrow: { color: colors.blue, fontFamily: typography.bold, fontSize: typeScale.xs, lineHeight: 18, letterSpacing: 0.8 },
  title: { color: colors.ink, fontFamily: typography.semibold, fontSize: typeScale.lg, lineHeight: 28, letterSpacing: -0.5, marginTop: 3 },
  headerIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  list: { padding: 16, paddingBottom: 28 },
  emptyList: { flexGrow: 1 },
  actionBanner: {
    alignItems: 'center',
    backgroundColor: '#FFF6DD',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    padding: 12,
  },
  actionBannerText: { color: '#7A4A00', flex: 1, fontFamily: typography.semibold, fontSize: typeScale.xs, lineHeight: 18 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
  filterChip: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  filterChipActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  filterText: { color: colors.text, fontFamily: typography.medium, fontSize: typeScale.xs, lineHeight: 18 },
  filterTextActive: { color: colors.white, fontFamily: typography.semibold },
  card: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: 12,
    padding: 15,
  },
  cardTop: { alignItems: 'flex-start', flexDirection: 'row' },
  statusIcon: { alignItems: 'center', borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  cardHeading: { flex: 1, marginLeft: 11, marginRight: 7 },
  cardTitle: { color: colors.ink, fontFamily: typography.bold, fontSize: typeScale.base, lineHeight: 24 },
  cardMeta: { color: colors.muted, fontFamily: typography.regular, fontSize: typeScale.xs, lineHeight: 18, marginTop: 4 },
  actionPill: { backgroundColor: '#FFF0EF', borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 5 },
  actionPillText: { color: '#D92D20', fontFamily: typography.bold, fontSize: typeScale.xs, lineHeight: 18, textTransform: 'uppercase' },
  detailRow: { alignItems: 'center', flexDirection: 'row', marginTop: 10 },
  detailText: { color: colors.muted, flex: 1, fontFamily: typography.regular, fontSize: typeScale.xs, lineHeight: 18, marginLeft: 5 },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 360, paddingHorizontal: 26 },
  loadingText: { color: colors.muted, fontFamily: typography.medium, fontSize: typeScale.xs, lineHeight: 18, marginTop: 12 },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 34,
    height: 68,
    justifyContent: 'center',
    width: 68,
  },
  emptyTitle: { color: colors.ink, fontFamily: typography.semibold, fontSize: typeScale.md, lineHeight: 26, marginTop: 17, textAlign: 'center' },
  emptyText: { color: colors.muted, fontFamily: typography.regular, fontSize: typeScale.xs, lineHeight: 18, marginTop: 7, textAlign: 'center' },
});

export default TenancyAgreementsScreen;
