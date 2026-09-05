import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';
import Input from '../../components/common/Input';
import {
  InfoRow,
  PremiumButton,
  PremiumCard,
  PremiumCenter,
  PremiumHero,
  StatusPill,
} from '../../components/common/PremiumLayout';
import { zonalAdminService } from '../../services/zonalAdminService';
import { getErrorMessage, pickList } from '../../utils/http';
import { colors, radius, typography } from '../../theme';
import AppText from '../../components/common/AppText';

const META = {
  admins: { title: 'Zone admins', role: false },
  users: { title: 'Zone users', role: true },
  properties: { title: 'Properties', role: false },
  applications: { title: 'Applications', role: false },
  verifications: { title: 'Verifications', role: false },
  escalations: { title: 'Open escalations', role: false },
  'service-operations': { title: 'Service operations', role: false },
};

const FIRST_FIELDS = [
  ['full_name', 'name', 'tenant_name', 'landlord_name'],
  ['title', 'property_title', 'subject'],
  ['email', 'phone', 'state_name', 'state', 'lga', 'priority', 'service_type'],
];

const subtitle = (row) =>
  [row.email, row.phone, row.city, row.lga, row.state_name, row.state].filter(Boolean).join(' · ') || '';

const ZonalListScreen = ({ route }) => {
  const resource = route?.params?.resource || 'users';
  const meta = META[resource] || { title: 'Records', role: false };
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [role, setRole] = useState('all');

  const load = useCallback(
    async ({ page = 1, limit = 100 } = {}) => {
      setLoading(true);
      try {
        const params = { page, limit };
        if (appliedSearch) params.search = appliedSearch;
        if (meta.role && role && role !== 'all') params.role = role;
        const res = await zonalAdminService.listResource(resource, params);
        setRows(pickList(res?.data || res, ['data']));
      } catch (err) {
        Toast.show({
          type: 'error',
          text1: 'Failed',
          text2: getErrorMessage(err, `Could not load ${meta.title.toLowerCase()}`),
        });
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [resource, appliedSearch, role, meta.role]
  );

  useFocusEffect(
    useCallback(() => {
      setAppliedSearch('');
      setRole('all');
      load({ page: 1 });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resource])
  );

  const apply = () => {
    setAppliedSearch(search.trim());
    load({ page: 1 });
  };

  if (loading && rows.length === 0) {
    return <PremiumCenter loading title={`Loading ${meta.title.toLowerCase()}`} />;
  }

  const firstText = (row) => {
    for (const group of FIRST_FIELDS) {
      for (const key of group) {
        const value = row?.[key];
        if (value !== undefined && value !== null && String(value).trim()) return String(value);
      }
    }
    return `Record #${row.id || ''}`;
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <PremiumHero
        eyebrow="Zonal admin"
        title={meta.title}
        subtitle="Records within your assigned zone."
        icon="business-outline"
      />

      <View style={styles.filters}>
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder={`Search ${meta.title.toLowerCase()}…`}
          icon="search-outline"
        />
        {meta.role ? (
          <View style={styles.roleRow}>
            {['all', 'tenant', 'landlord'].map((key) => {
              const active = role === key;
              return (
                <TouchableOpacity
                  key={key}
                  activeOpacity={0.85}
                  onPress={() => setRole(key)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <AppText style={[styles.chipText, active && styles.chipTextActive]}>
                    {key === 'all' ? 'All roles' : key[0].toUpperCase() + key.slice(1)}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
        <PremiumButton title="Apply filters" onPress={apply} icon="funnel-outline" size="sm" style={styles.apply} />
      </View>

      {rows.length === 0 ? (
        <PremiumCard>
          <AppText style={styles.empty}>No {meta.title.toLowerCase()} match the current filters.</AppText>
        </PremiumCard>
      ) : (
        rows.map((item, index) => {
          const label = firstText(item);
          const sub = subtitle(item);
          return (
            <PremiumCard key={String(item.id || index)}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <AppText style={styles.cardTitle}>{label}</AppText>
                  {sub ? <AppText style={styles.cardMeta}>{sub}</AppText> : null}
                </View>
                {item.status || item.approval_status || item.user_type ? (
                  <StatusPill label={item.approval_status || item.status || item.user_type} color={colors.blue} />
                ) : null}
              </View>
              {item.id ? <InfoRow icon="pricetag-outline" label="ID" value={String(item.id)} /> : null}
              {item.created_at ? (
                <InfoRow icon="time-outline" label="Created" value={new Date(item.created_at).toLocaleDateString()} />
              ) : null}
            </PremiumCard>
          );
        })
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 18, paddingBottom: 36 },
  filters: { marginBottom: 14 },
  roleRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  chip: {
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { color: colors.text, fontFamily: typography.medium, fontSize: 13 },
  chipTextActive: { color: colors.white },
  apply: { marginTop: 12, alignSelf: 'flex-end' },
  rowBetween: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: { color: colors.ink, fontFamily: typography.bold, fontSize: 16 },
  cardMeta: { color: colors.muted, fontFamily: typography.regular, fontSize: 12, marginTop: 2 },
  empty: { color: colors.muted, fontFamily: typography.regular, fontSize: 13 },
});

export default ZonalListScreen;
