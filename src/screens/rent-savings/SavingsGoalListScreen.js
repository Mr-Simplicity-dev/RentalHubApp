import React, { useCallback, useEffect, useState } from 'react';
import {StyleSheet TouchableOpacity, View} from 'react-native';
import Toast from 'react-native-toast-message';
import {
  InfoRow,
  PremiumButton,
  PremiumCard,
  PremiumHero,
  PremiumListScreen,
  StatusPill,
  formatNaira,
} from '../../components/common/PremiumLayout';
import { rentSavingsService } from '../../services/rentSavingsService';
import { getErrorMessage, pickList } from '../../utils/http';
import { colors, radius, typography } from '../../theme';

import AppText from '../../components/common/AppText';
const getProgress = (item) => {
  const target = Number(item.target_savings_amount || 0);
  const saved = Number(item.total_saved || 0);
  return Math.min(target ? (saved / target) * 100 : 0, 100);
};

const ProgressBar = ({ value }) => (
  <View style={styles.progressBar}>
    <View style={[styles.progressFill, { width: `${value}%` }]} />
  </View>
);

const SavingsGoalListScreen = ({ navigation }) => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadGoals = useCallback(async () => {
    try {
      const response = await rentSavingsService.getSavingsPlans();
      setGoals(pickList(response, ['data', 'goals']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load savings goals'),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const header = (
    <>
      <PremiumHero
        eyebrow="Rent savings"
        title={`My savings plans (${goals.length})`}
        subtitle="Build rent discipline with visible progress, due dates and target tracking."
        icon="wallet-outline"
      />
      <PremiumButton
        title="Create new plan"
        onPress={() => navigation.navigate('SavingsGoalCreate')}
        icon="add-circle-outline"
        style={styles.createButton}
      />
    </>
  );

  return (
    <PremiumListScreen
      data={goals}
      keyExtractor={(item) => String(item.id)}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        loadGoals();
      }}
      header={header}
      emptyTitle={loading ? 'Loading savings plans' : 'No savings plans yet'}
      emptyMessage={loading ? 'Please wait while we prepare your rent-savings records.' : 'Create your first plan from an approved rental application.'}
      emptyIcon="wallet-outline"
      renderItem={({ item }) => {
        const progress = getProgress(item);
        const status = item.status || 'active';
        return (
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={() => navigation.navigate('SavingsGoalDetail', { goalId: item.id })}
          >
            <PremiumCard>
              <View style={styles.cardHeader}>
                <View style={styles.titleBlock}>
                  <AppText style={styles.cardTitle}>{item.property_title || 'Rent savings plan'}</AppText>
                  <AppText style={styles.cardTarget}>{formatNaira(item.target_savings_amount)}</AppText>
                </View>
                <StatusPill label={status} color={status === 'active' ? colors.blue : colors.muted} />
              </View>
              <ProgressBar value={progress} />
              <AppText style={styles.progressCopy}>
                {formatNaira(item.total_saved || 0)} saved • {Math.round(progress)}% complete
              </AppText>
              {item.rent_due_date ? (
                <InfoRow
                  icon="calendar-outline"
                  label="Rent due"
                  value={new Date(item.rent_due_date).toLocaleDateString()}
                />
              ) : null}
            </PremiumCard>
          </TouchableOpacity>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  createButton: {
    marginBottom: 12,
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
    fontSize: 16,
  },
  cardTarget: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 24,
    marginTop: 5,
  },
  progressBar: {
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    height: 10,
    marginTop: 14,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    height: '100%',
  },
  progressCopy: {
    color: colors.text,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 8,
  },
});

export default SavingsGoalListScreen;
