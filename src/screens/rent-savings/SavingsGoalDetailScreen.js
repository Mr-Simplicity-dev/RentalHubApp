import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { rentSavingsService } from '../../services/rentSavingsService';
import Button from '../../components/common/Button';
import { getErrorMessage, pickObject, pickList } from '../../utils/http';

const formatCurrency = (value) => `NGN ${Number(value || 0).toLocaleString()}`;

const SavingsGoalDetailScreen = ({ route, navigation }) => {
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
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  if (!goal) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Goal not found.</Text>
      </View>
    );
  }

  const targetAmount = Number(goal.target_savings_amount || 0);
  const savedAmount = Number(goal.total_saved || 0);
  const progress = Math.min(targetAmount ? (savedAmount / targetAmount) * 100 : 0, 100);

  return (
    <>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <Text style={styles.goalName}>{goal.property_title || 'Rent savings plan'}</Text>
          <Text style={[styles.goalStatus, goal.status === 'active' && styles.statusActive]}>
            {goal.status || 'active'}
          </Text>
        </View>

        <View style={styles.amountRow}>
          <View style={styles.amountItem}>
            <Text style={styles.amountLabel}>Target</Text>
            <Text style={styles.amountValue}>{formatCurrency(targetAmount)}</Text>
          </View>
          <View style={styles.amountItem}>
            <Text style={styles.amountLabel}>Saved</Text>
            <Text style={[styles.amountValue, styles.savedValue]}>
              {formatCurrency(savedAmount)}
            </Text>
          </View>
          <View style={styles.amountItem}>
            <Text style={styles.amountLabel}>Remaining</Text>
            <Text style={styles.amountValue}>
              {formatCurrency(Math.max(0, targetAmount - savedAmount))}
            </Text>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(progress)}% complete</Text>
        </View>

        {goal.property_address ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Property</Text>
            <Text style={styles.description}>{goal.property_address}</Text>
          </View>
        ) : null}

        {goal.rent_due_date ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rent Due Date</Text>
            <Text style={styles.description}>
              {new Date(goal.rent_due_date).toLocaleDateString()}
            </Text>
          </View>
        ) : null}

        <Button
          title="Add Contribution"
          onPress={() => setContributeModal(true)}
          icon="add-circle-outline"
        />

        {contributions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contribution History</Text>
            {contributions.map((c, i) => (
              <View key={c.id || i} style={styles.contribCard}>
                <Text style={styles.contribAmount}>{formatCurrency(c.amount)}</Text>
                <Text style={styles.contribDate}>
                  {c.contributed_at ? new Date(c.contributed_at).toLocaleDateString() : 'N/A'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={contributeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Contribution</Text>
            <TextInput
              style={styles.modalInput}
              value={contributionAmount}
              onChangeText={setContributionAmount}
              placeholder="Amount (NGN)"
              keyboardType="numeric"
              placeholderTextColor="#94a3b8"
            />
            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => {
                  setContributeModal(false);
                  setContributionAmount('');
                }}
                style={styles.modalBtn}
              />
              <Button
                title={contributing ? 'Saving...' : 'Save'}
                onPress={handleContribute}
                loading={contributing}
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { fontSize: 16, color: '#64748b' },
  headerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalName: { fontSize: 24, fontWeight: '800', color: '#0f172a', flex: 1 },
  goalStatus: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    overflow: 'hidden',
    textTransform: 'capitalize',
  },
  statusActive: { color: '#0284c7', backgroundColor: '#e0f2fe' },
  amountRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  amountItem: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
  },
  amountLabel: { color: '#64748b', fontSize: 12, fontWeight: '500' },
  amountValue: { color: '#0f172a', fontSize: 18, fontWeight: '800', marginTop: 4 },
  savedValue: { color: '#0284c7' },
  progressSection: { marginBottom: 20 },
  progressBar: {
    height: 12,
    backgroundColor: '#e2e8f0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#0284c7', borderRadius: 6 },
  progressText: { color: '#475569', fontSize: 13, marginTop: 6, textAlign: 'center' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  description: { color: '#334155', lineHeight: 22 },
  contribCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
  },
  contribAmount: { fontWeight: '700', color: '#0f172a' },
  contribDate: { color: '#64748b' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 30,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 14 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
    marginBottom: 16,
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalBtn: { flex: 1 },
});

export default SavingsGoalDetailScreen;
