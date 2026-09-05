import React, { useCallback, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';
import {
  InfoRow,
  PremiumCard,
  PremiumCenter,
  PremiumHero,
  PremiumListScreen,
} from '../../components/common/PremiumLayout';
import { zonalAdminService } from '../../services/zonalAdminService';
import { getErrorMessage, pickList } from '../../utils/http';
import { colors, radius, typography } from '../../theme';
import AppText from '../../components/common/AppText';

const RESOURCE_TITLES = {
  admins: 'Zone admins',
  users: 'Zone users',
  properties: 'Properties',
  applications: 'Applications',
  verifications: 'Verifications',
  escalations: 'Open escalations',
  'service-operations': 'Service operations',
};

const FIELD_POOL = [
  ['full_name', 'name'],
  ['property_title', 'title'],
  ['email', 'phone', 'lga_name', 'state_name', 'state'],
  ['respondent_name', 'applicant_name'],
  ['status'],
];

const firstText = (row) => {
  for (const group of FIELD_POOL) {
    for (const key of group) {
      const value = row?.[key];
      if (value !== undefined && value !== null && String(value).trim()) {
        return String(value);
      }
    }
  }
  return null;
};

const ZonalListScreen = ({ route }) => {
  const resource = route?.params?.resource || 'users';
  const title = RESOURCE_TITLES[resource] || 'Records';
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await zonalAdminService.listResource(resource);
      setRows(pickList(res?.data || res, ['data']));
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(err, `Could not load ${title.toLowerCase()}`),
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [resource, title]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading && rows.length === 0) {
    return <PremiumCenter loading title={`Loading ${title.toLowerCase()}`} />;
  }

  return (
    <PremiumListScreen
      data={rows}
      keyExtractor={(item, index) => String(item.id || index)}
      refreshing={loading}
      onRefresh={load}
      header={
        <PremiumHero
          eyebrow="Zonal admin"
          title={title}
          subtitle="Records within your assigned zone."
          icon="business-outline"
        />
      }
      emptyTitle={`No ${title.toLowerCase()}`}
      emptyMessage={`${title} within your zone will appear here.`}
      emptyIcon="list-outline"
      renderItem={({ item }) => (
        <PremiumCard>
          <View style={styles.cardTop}>
            <AppText style={styles.cardTitle}>{firstText(item) || `Record #${item.id}`}</AppText>
          </View>
          {item.id ? <InfoRow icon="pricetag-outline" label="ID" value={String(item.id)} /> : null}
          {item.email ? <InfoRow icon="mail-outline" label="Email" value={item.email} /> : null}
          {item.created_at ? (
            <InfoRow icon="time-outline" label="Created" value={new Date(item.created_at).toLocaleDateString()} />
          ) : null}
        </PremiumCard>
      )}
    />
  );
};

const styles = StyleSheet.create({
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 16,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  quick: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickText: {
    color: colors.blue,
    fontFamily: typography.semibold,
    fontSize: 13,
  },
});

export default ZonalListScreen;
