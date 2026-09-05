import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';
import {
  PremiumButton,
  PremiumCard,
  PremiumCenter,
  PremiumHero,
  PremiumListScreen,
  StatusPill,
} from '../../components/common/PremiumLayout';
import { appealsService } from '../../services/appealsService';
import { getErrorMessage, pickList } from '../../utils/http';
import { colors, radius, typography } from '../../theme';
import AppText from '../../components/common/AppText';

const STATUS_CONFIG = {
  pending: { color: colors.blue, label: 'Pending' },
  under_review: { color: '#B46B00', label: 'Under review' },
  upheld: { color: colors.success, label: 'Upheld' },
  dismissed: { color: colors.danger, label: 'Dismissed' },
};

const getStatus = (status) => STATUS_CONFIG[String(status || 'pending')] || STATUS_CONFIG.pending;

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

const MyAppealsScreen = ({ navigation }) => {
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAppeals = useCallback(async ({ refresh = false } = {}) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const response = await appealsService.myAppeals({ limit: 50 });
      setAppeals(pickList(response, ['data']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load your appeals'),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAppeals();
    }, [loadAppeals])
  );

  const header = (
    <>
      <PremiumHero
        eyebrow="Appeals"
        title="My appeals"
        subtitle="Track appeals you have submitted against a rejected property or verification."
        icon="megaphone-outline"
      />
      <PremiumButton
        title="Submit an appeal"
        onPress={() => navigation.navigate('AppealCreate')}
        icon="add-circle-outline"
        style={styles.newButton}
      />
    </>
  );

  return loading && appeals.length === 0 ? (
    <PremiumCenter loading title="Loading appeals" />
  ) : (
    <PremiumListScreen
      data={appeals}
      keyExtractor={(item) => String(item.id)}
      refreshing={refreshing}
      onRefresh={() => loadAppeals({ refresh: true })}
      header={header}
      emptyTitle="No appeals yet"
      emptyMessage="Appeal a rejected property or identity-verification decision from here."
      emptyIcon="megaphone-outline"
      renderItem={({ item }) => {
        const status = getStatus(item.status);
        return (
          <PremiumCard>
            <View style={styles.cardHeader}>
              <View style={styles.titleBlock}>
                <AppText style={styles.cardTitle}>
                  {item.appeal_type === 'property' ? 'Property appeal' : 'Verification appeal'}
                </AppText>
                {item.property_title ? (
                  <AppText style={styles.propertyTitle}>{item.property_title}</AppText>
                ) : null}
              </View>
              <StatusPill label={status.label} color={status.color} />
            </View>

            <AppText style={styles.reason}>{item.appeal_reason}</AppText>

            {item.additional_info ? (
              <AppText style={styles.additional}>{item.additional_info}</AppText>
            ) : null}

            {item.review_note ? (
              <View style={styles.reviewBox}>
                <AppText style={styles.reviewLabel}>Reviewer note</AppText>
                <AppText style={styles.reviewText}>{item.review_note}</AppText>
              </View>
            ) : null}

            <AppText style={styles.date}>{formatDate(item.created_at)}</AppText>
          </PremiumCard>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  newButton: {
    marginBottom: 6,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  titleBlock: {
    flex: 1,
  },
  cardTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 15,
  },
  propertyTitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 2,
  },
  reason: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },
  additional: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  reviewBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginTop: 10,
    padding: 12,
  },
  reviewLabel: {
    color: colors.muted,
    fontFamily: typography.semibold,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  reviewText: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  date: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    marginTop: 10,
  },
});

export default MyAppealsScreen;
