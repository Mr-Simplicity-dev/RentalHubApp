import React, { useEffect, useState, useCallback, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { rentSavingsService } from '../../services/rentSavingsService';
import { getErrorMessage, pickObject } from '../../utils/http';
import { colors, radius, shadows, typography } from '../../theme';

import AppText from '../../components/common/AppText';
const formatCurrency = (value) => `₦${Number(value || 0).toLocaleString()}`;

const RentSavingsDashboardScreen = ({ navigation }) => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadDashboard = useCallback(async () => {
    try {
      const response = await rentSavingsService.getSummary();
      setDashboard(pickObject(response, ['data', 'dashboard']) || {});
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load savings dashboard'),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const totalSaved = dashboard?.total_saved_across_plans ?? 0;
  const totalGoals = dashboard?.total_plans ?? 0;
  const activeGoals = dashboard?.active_plans ?? 0;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}
    >
      <View style={styles.summaryCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}><Icon name="leaf-outline" size={22} color={colors.gold} /></View>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}><Icon name="refresh" size={19} color={colors.white} /></TouchableOpacity>
        </View>
        <AppText style={styles.summaryLabel}>TOTAL SAVED FOR RENT</AppText>
        <AppText style={styles.summaryValue}>{formatCurrency(totalSaved)}</AppText>
        <AppText style={styles.heroCaption}>Build your next rent payment steadily and confidently.</AppText>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <AppText style={styles.summaryItemValue}>{totalGoals}</AppText>
            <AppText style={styles.summaryItemLabel}>Total plans</AppText>
          </View>
          <View style={styles.summaryItem}>
            <AppText style={styles.summaryItemValue}>{activeGoals}</AppText>
            <AppText style={styles.summaryItemLabel}>Active plans</AppText>
          </View>
        </View>
      </View>

      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('SavingsGoalCreate')}
        >
          <View style={styles.actionIcon}><Icon name="add" size={23} color={colors.blue} /></View>
          <View style={styles.actionCopy}><AppText style={styles.actionText}>Create a plan</AppText><AppText style={styles.actionSub}>Set a new rent target</AppText></View>
          <Icon name="chevron-forward" size={17} color={colors.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('SavingsGoalList')}
        >
          <View style={styles.actionIcon}><Icon name="list-outline" size={22} color={colors.blue} /></View>
          <View style={styles.actionCopy}><AppText style={styles.actionText}>My plans</AppText><AppText style={styles.actionSub}>Track every goal</AppText></View>
          <Icon name="chevron-forward" size={17} color={colors.muted} />
        </TouchableOpacity>
      </View>

      {dashboard?.upcoming_due?.length > 0 && (
        <>
          <View style={styles.sectionHeader}><AppText style={styles.sectionTitle}>Upcoming rent</AppText><AppText style={styles.sectionCount}>{dashboard.upcoming_due.length} due</AppText></View>
          {dashboard.upcoming_due.map((goal) => (
            <TouchableOpacity
              key={goal.id}
              style={styles.goalCard}
              onPress={() => navigation.navigate('SavingsGoalDetail', { goalId: goal.id })}
            >
              <View style={styles.goalHeader}>
                <View style={styles.goalIcon}><Icon name="home-outline" size={18} color={colors.blue} /></View>
                <AppText style={styles.goalName}>Plan #{goal.id}</AppText>
                <AppText style={styles.goalStatus}>
                  {new Date(goal.rent_due_date).toLocaleDateString()}
                </AppText>
              </View>
              <AppText style={styles.goalTarget}>{formatCurrency(goal.target_savings_amount)}</AppText>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(
                        Number(goal.target_savings_amount)
                          ? (Number(goal.total_saved || 0) / Number(goal.target_savings_amount)) * 100
                          : 0,
                        100
                      )}%`,
                    },
                  ]}
                />
              </View>
              <AppText style={styles.goalProgress}>
                {formatCurrency(goal.total_saved || 0)} saved
              </AppText>
            </TouchableOpacity>
          ))}
        </>
      )}
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 18, paddingBottom: 36 },
  summaryCard: {
    backgroundColor: colors.navy,
    borderRadius: radius.lg,
    padding: 22,
    marginBottom: 14,
    ...shadows.soft,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  heroIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: colors.navySoft, alignItems: 'center', justifyContent: 'center' },
  refreshButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.navySoft, alignItems: 'center', justifyContent: 'center' },
  summaryLabel: { color: colors.gold, fontFamily: typography.semibold, fontSize: 13, letterSpacing: 1.25 },
  summaryValue: { color: colors.white, fontFamily: typography.bold, fontSize: 36, marginTop: 5 },
  heroCaption: { marginTop: 7, color: '#B9C9E5', fontFamily: typography.regular, lineHeight: 20 },
  summaryRow: { flexDirection: 'row', marginTop: 16, gap: 16 },
  summaryItem: { flex: 1, backgroundColor: colors.navySoft, borderRadius: radius.md, padding: 12 },
  summaryItemValue: { color: colors.white, fontFamily: typography.bold, fontSize: 20 },
  summaryItemLabel: { color: '#AFC3E6', fontFamily: typography.regular, fontSize: 13, marginTop: 2 },
  actionsGrid: { gap: 9, marginBottom: 22 },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 13,
  },
  actionIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceBlue, marginRight: 11 },
  actionCopy: { flex: 1 },
  actionText: { color: colors.ink, fontFamily: typography.semibold },
  actionSub: { marginTop: 3, color: colors.muted, fontFamily: typography.regular, fontSize: 13 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontFamily: typography.bold, fontSize: 18, color: colors.ink },
  sectionCount: { fontFamily: typography.medium, fontSize: 13, color: colors.muted },
  goalCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
  },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceBlue, marginRight: 9 },
  goalName: { flex: 1, fontFamily: typography.semibold, color: colors.ink },
  goalStatus: { fontFamily: typography.semibold, fontSize: 13, color: colors.blue },
  goalTarget: { fontFamily: typography.bold, fontSize: 24, color: colors.ink, marginTop: 12 },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.blue, borderRadius: 4 },
  goalProgress: { color: colors.muted, fontFamily: typography.regular, fontSize: 13, marginTop: 6 },
});

export default RentSavingsDashboardScreen;
