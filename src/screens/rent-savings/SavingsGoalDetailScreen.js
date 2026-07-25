import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
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
import { colors, radius, typography } from '../../theme';

import AppText from '../../components/common/AppText';
const ProgressBar = ({ value }) => (
  <View style={styles.progressBar}>
    <View style={[styles.progressFill, { width: `${value}%` }]} />
  </View>
);

const SavingsGoalDetailScreen = ({ route }) => {
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
        text1: 'Failed',
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
      Toast.show({ type: 'error', text1: 'Enter a valid amount' });
      return;
    }

    setContributing(true);
    try {
      const response = await rentSavingsService.makeContribution(goalId, {
        amount,
        month: new Date().toISOString().slice(0, 7),
      });
      if (response?.success || response?.data?.id) {
        Toast.show({ type: 'success', text1: 'Contribution added!' });
        setContributeModal(false);
        setContributionAmount('');
        loadGoal();
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not add contribution'),
      });
    } finally {
      setContributing(false);
    }
  };

  if (loading) {
    return <PremiumCenter loading title="Loading savings goal" />;
  }

  if (!goal) {
    return (
      <PremiumCenter
        icon="wallet-outline"
        title="Goal not found"
        message="This savings plan could not be loaded."
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
          eyebrow="Rent savings"
          title={goal.property_title || 'Rent savings plan'}
          subtitle={`${Math.round(progress)}% complete • ${formatNaira(remainingAmount)} remaining`}
          icon="wallet-outline"
          right={<StatusPill label={status} color={status === 'active' ? colors.blue : colors.muted} />}
        />

        <View style={styles.amountRow}>
          <PremiumCard style={styles.amountItem}>
            <AppText style={styles.amountLabel}>Target</AppText>
            <AppText style={styles.amountValue}>{formatNaira(targetAmount)}</AppText>
          </PremiumCard>
          <PremiumCard style={styles.amountItem}>
            <AppText style={styles.amountLabel}>Saved</AppText>
            <AppText style={[styles.amountValue, styles.savedValue]}>{formatNaira(savedAmount)}</AppText>
          </PremiumCard>
        </View>

        <PremiumCard>
          <ProgressBar value={progress} />
          <AppText style={styles.progressText}>{Math.round(progress)}% complete</AppText>
          <InfoRow icon="cash-outline" label="Remaining" value={formatNaira(remainingAmount)} />
        </PremiumCard>

        {goal.property_address ? (
          <>
            <PremiumSectionTitle title="Property" />
            <PremiumCard>
              <AppText style={styles.description}>{goal.property_address}</AppText>
            </PremiumCard>
          </>
        ) : null}

        {goal.rent_due_date ? (
          <PremiumCard>
            <InfoRow
              icon="calendar-outline"
              label="Rent due date"
              value={new Date(goal.rent_due_date).toLocaleDateString()}
            />
          </PremiumCard>
        ) : null}

        <PremiumButton
          title="Add contribution"
          onPress={() => setContributeModal(true)}
          icon="add-circle-outline"
          style={styles.addButton}
        />

        <PremiumSectionTitle
          title="Contribution history"
          subtitle="Recent deposits towards this rent target."
        />
        {contributions.length > 0 ? (
          contributions.map((item, index) => (
            <PremiumCard key={item.id || index}>
              <InfoRow icon="cash-outline" label="Amount" value={formatNaira(item.amount)} />
              <InfoRow
                icon="calendar-outline"
                label="Date"
                value={item.contributed_at ? new Date(item.contributed_at).toLocaleDateString() : 'N/A'}
              />
            </PremiumCard>
          ))
        ) : (
          <EmptyPanel
            title="No contributions yet"
            message="Add your first contribution to start building this rent plan."
            icon="cash-outline"
          />
        )}
      </PremiumScreen>

      <Modal visible={contributeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <PremiumCard style={styles.modalContent}>
            <AppText style={styles.modalTitle}>Add contribution</AppText>
            <Input
              label="Amount"
              value={contributionAmount}
              onChangeText={setContributionAmount}
              placeholder="Amount (NGN)"
              keyboardType="numeric"
              icon="cash-outline"
            />
            <View style={styles.modalActions}>
              <PremiumButton
                title="Cancel"
                variant="secondary"
                onPress={() => {
                  setContributeModal(false);
                  setContributionAmount('');
                }}
                style={styles.modalButton}
              />
              <PremiumButton
                title="Save"
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
    fontSize: 13,
    textTransform: 'uppercase',
  },
  amountValue: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 18,
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
    fontSize: 13,
    marginBottom: 8,
    marginTop: 8,
    textAlign: 'center',
  },
  description: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 14,
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
    fontFamily: typography.bold,
    fontSize: 20,
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
