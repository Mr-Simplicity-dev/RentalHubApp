import React, { useEffect, useLayoutEffect, useState } from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/Ionicons';
import { legalService } from '../../services/legalService';
import { getErrorMessage, pickList } from '../../utils/http';
import { colors, radius, typography, typeScale } from '../../theme';
import AppText from '../../components/common/AppText';
import {
  DashboardHero,
  DashboardScreen,
  DashboardSection,
} from '../../components/dashboard/DashboardKit';

const tierLabel = (userType) => {
  if (userType === 'super_lawyer') return 'National';
  if (userType === 'zonal_lawyer') return 'Zonal';
  if (userType === 'state_lawyer') return 'State';
  return 'LGA';
};

const InternalLawyerDirectoryScreen = ({ navigation }) => {
  const [lawyers, setLawyers] = useState([]);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: navigation.canGoBack() });
  }, [navigation]);

  const load = async () => {
    setLoading(true);
    try {
      const response = await legalService.getInternalLawyerDirectory();
      setLawyers(pickList(response, ['data']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Directory unavailable',
        text2: getErrorMessage(error, 'Could not load lawyer directory'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <DashboardScreen refreshing={loading} onRefresh={load}>
      <DashboardHero
        eyebrow="INTERNAL"
        title="Lawyer directory"
        subtitle="Roster of legal professionals and their assigned cases within your jurisdiction."
        icon="people-outline"
        onRefresh={load}
      />

      <DashboardSection title="Lawyers">
        {loading && !lawyers.length ? <ActivityIndicator color={colors.blue} /> : null}
        {!loading && !lawyers.length ? (
          <AppText style={styles.empty}>No lawyers found in your jurisdiction.</AppText>
        ) : null}
        {lawyers.map((lawyer) => (
          <View key={String(lawyer.id)} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.avatar}>
                <AppText style={styles.avatarText}>{String(lawyer.full_name || 'L').charAt(0).toUpperCase()}</AppText>
              </View>
              <View style={styles.cardCopy}>
                <AppText style={styles.name}>{lawyer.full_name}</AppText>
                <AppText style={styles.meta}>
                  {[tierLabel(lawyer.user_type), lawyer.assigned_state, lawyer.assigned_city, lawyer.assigned_zone].filter(Boolean).join(' · ')}
                </AppText>
              </View>
              <View style={styles.tierBadge}>
                <AppText style={styles.tierText}>{tierLabel(lawyer.user_type)}</AppText>
              </View>
            </View>

            <View style={styles.casesHeader}>
              <AppText style={styles.casesLabel}>Cases ({lawyer.cases?.length || 0})</AppText>
            </View>
            {(lawyer.cases || []).map((c, i) => (
              <View key={String(c.dispute_id || i)} style={styles.caseRow}>
                <Icon
                  name={c.status === 'resolved' ? 'checkmark-circle' : 'time-outline'}
                  size={16}
                  color={c.status === 'resolved' ? colors.success : colors.warning}
                />
                <AppText style={styles.caseTitle} numberOfLines={1}>{c.title || `Case #${c.dispute_id}`}</AppText>
                <AppText style={styles.caseStatus}>{c.status || 'active'}</AppText>
              </View>
            ))}
          </View>
        ))}
      </DashboardSection>
    </DashboardScreen>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 14,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  avatarText: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 17,
  },
  cardCopy: { flex: 1 },
  name: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: typeScale.base,
    lineHeight: 24,
  },
  meta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 2,
  },
  tierBadge: {
    backgroundColor: colors.surfaceBlue,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tierText: {
    color: colors.blue,
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  casesHeader: { marginTop: 12 },
  casesLabel: {
    color: colors.muted,
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
    textTransform: 'uppercase',
  },
  caseRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  caseTitle: {
    color: colors.text,
    flex: 1,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  caseStatus: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
    textTransform: 'capitalize',
  },
  empty: {
    color: colors.muted,
    fontFamily: typography.regular,
    lineHeight: 20,
  },
});

export default InternalLawyerDirectoryScreen;
