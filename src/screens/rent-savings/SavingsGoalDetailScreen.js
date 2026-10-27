import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useEffect, useState } from 'react';
import {Modal, StyleSheet, View} from 'react-native';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import {
  EmptyPanel,
  InfoRow,
  PremiumButton,
  PremiumCard,
  PremiumCenter,
  PremiumHero,
  PremiumScreen,
  PremiumSectionTitle,
  StatusPill,
  formatNaira,
} from '../../components/common/PremiumLayout';
import { rentSavingsService } from '../../services/rentSavingsService';
import { getErrorMessage, pickList, pickObject } from '../../utils/http';
import { colors, radius, typography, typeScale } from '../../theme';

import AppText from '../../components/common/AppText';
const ProgressBar = ({ value }) => { useInterfaceLanguage(); return (<View style={styles.progressBar}>
    <View style={[styles.progressFill, { width: `${value}%` }]} />
  </View>); };

const SavingsGoalDetailScreen = ({ route }) => {
  useInterfaceLanguage();
  const { goalId } = route?.params || {};
  const [goal, setGoal] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contributeModal, setContributeModal] = useState(false);
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributing, setContributing] = useState(false);

  const loadGoal = async () => {
    if (!goalId) return;
    setLoading(true);
    try {
      const response = await rentSavingsService.getSavingsPlanDetails(goalId);
      setGoal(pickObject(response, ['data', 'goal']));

      const contribResponse = await rentSavingsService.getContributions(goalId);
      setContributions(pickList(contribResponse, ['data', 'contributions']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Failed"),
        text2: getErrorMessage(error, 'Could not load goal details'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoal();
  }, [goalId]);

  const handleContribute = async () => {
    const amount = Number(contributionAmount);
    if (!amount || amount <= 0) {
      Toast.show({ type: 'error', text1: ui("Enter a valid amount") });
      return;
    }

    setContributing(true);
    try {
      const response = await rentSavingsService.makeContribution(goalId, {
        amount,
        month: new Date().toISOString().slice(0, 7),
      });
      if (response?.success || response?.data?.id) {
        Toast.show({ type: 'success', text1: ui("Contribution added!") });
        setContributeModal(false);
        setContributionAmount('');
        loadGoal();
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Failed"),
        text2: getErrorMessage(error, 'Could not add contribution'),
      });
    } finally {
      setContributing(false);
    }
  };

  if (loading) {
    return <PremiumCenter loading title={ui("Loading savings goal")} />;
  }

  if (!goal) {
    return (
      <PremiumCenter
        icon="wallet-outline"
        title={ui("Goal not found")}
        message={ui("This savings plan could not be loaded.")}
      />
    );
  }

  const targetAmount = Number(goal.target_savings_amount || 0);
  const savedAmount = Number(goal.total_saved || 0);
  const remainingAmount = Math.max(0, targetAmount - savedAmount);
  const progress = Math.min(targetAmount ? (savedAmount / targetAmount) * 100 : 0, 100);
  const status = goal.status || 'active';

  return (
    <>
      <PremiumScreen>
        <PremiumHero
          eyebrow={ui("Rent savings")}
          title={goal.property_title || 'Rent savings plan'}
          subtitle={ui("{value0}% complete • {value1} remaining", {value0: (Math.round(progress)), value1: (formatNaira(remainingAmount))})}
          icon="wallet-outline"
          right={<StatusPill label={status} color={status === 'active' ? colors.blue : colors.muted} />}
        />

        <View style={styles.amountRow}>
          <PremiumCard style={styles.amountItem}>
            <AppText style={styles.amountLabel}>{ui("Target")}</AppText>
            <AppText style={styles.amountValue}>{formatNaira(targetAmount)}</AppText>
          </PremiumCard>
          <PremiumCard style={styles.amountItem}>
            <AppText style={styles.amountLabel}>{ui("Saved")}</AppText>
            <AppText style={[styles.amountValue, styles.savedValue]}>{formatNaira(savedAmount)}</AppText>
          </PremiumCard>
        </View>

        <PremiumCard>
          <ProgressBar value={progress} />
          <AppText style={styles.progressText}>{Math.round(progress)}{ui("% complete")}</AppText>
          <InfoRow icon="cash-outline" label={ui("Remaining")} value={formatNaira(remainingAmount)} />
        </PremiumCard>

        {goal.property_address ? (
          <>
            <PremiumSectionTitle title={ui("Property")} />
            <PremiumCard>
              <AppText style={styles.description}>{goal.property_address}</AppText>
            </PremiumCard>
          </>
        ) : null}

        {goal.rent_due_date ? (
          <PremiumCard>
            <InfoRow
              icon="calendar-outline"
              label={ui("Rent due date")}
              value={new Date(goal.rent_due_date).toLocaleDateString()}
            />
          </PremiumCard>
        ) : null}

        <PremiumButton
          title={ui("Add contribution")}
          onPress={() => setContributeModal(true)}
          icon="add-circle-outline"
          style={styles.addButton}
        />

        <PremiumSectionTitle
          title={ui("Contribution history")}
          subtitle={ui("Recent deposits towards this rent target.")}
        />
        {contributions.length > 0 ? (
          contributions.map((item, index) => (
            <PremiumCard key={item.id || index}>
              <InfoRow icon="cash-outline" label={ui("Amount")} value={formatNaira(item.amount)} />
              <InfoRow
                icon="calendar-outline"
                label={ui("Date")}
                value={item.contributed_at ? new Date(item.contributed_at).toLocaleDateString() : 'N/A'}
              />
            </PremiumCard>
          ))
        ) : (
          <EmptyPanel
            title={ui("No contributions yet")}
            message={ui("Add your first contribution to start building this rent plan.")}
            icon="cash-outline"
          />
        )}
      </PremiumScreen>

      <Modal visible={contributeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <PremiumCard style={styles.modalContent}>
            <AppText style={styles.modalTitle}>{ui("Add contribution")}</AppText>
            <Input
              label={ui("Amount")}
              value={contributionAmount}
              onChangeText={setContributionAmount}
              placeholder={ui("Amount (NGN)")}
              keyboardType="numeric"
              icon="cash-outline"
            />
            <View style={styles.modalActions}>
              <PremiumButton
                title={ui("Cancel")}
                variant="secondary"
                onPress={() => {
                  setContributeModal(false);
                  setContributionAmount('');
                }}
                style={styles.modalButton}
              />
              <PremiumButton
                title={ui("Save")}
                onPress={handleContribute}
                loading={contributing}
                style={styles.modalButton}
              />
            </View>
          </PremiumCard>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  amountRow: {
    flexDirection: 'row',
    gap: 10,
  },
  amountItem: {
    flex: 1,
  },
  amountLabel: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
    textTransform: 'uppercase',
  },
  amountValue: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: typeScale.md,
    lineHeight: 26,
    marginTop: 5,
  },
  savedValue: {
    color: colors.blue,
  },
  progressBar: {
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    height: 12,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    height: '100%',
  },
  progressText: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginBottom: 8,
    marginTop: 8,
    textAlign: 'center',
  },
  description: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: typeScale.reading,
    lineHeight: 22,
  },
  addButton: {
    marginBottom: 10,
  },
  modalOverlay: {
    backgroundColor: 'rgba(7, 26, 61, 0.62)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    marginBottom: 0,
  },
  modalTitle: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: typeScale.lg,
    lineHeight: 28,
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
  },
});

export default SavingsGoalDetailScreen;
