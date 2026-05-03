import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { rentSavingsService } from '../../services/rentSavingsService';
import { getErrorMessage } from '../../utils/http';

const SavingsGoalCreateScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Goal name is required';
    if (!targetAmount || isNaN(Number(targetAmount)) || Number(targetAmount) <= 0) {
      newErrors.targetAmount = 'Enter a valid target amount';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const response = await rentSavingsService.createSavingsGoal({
        name: name.trim(),
        target_amount: Number(targetAmount),
        description: description.trim(),
        target_date: targetDate.trim() || undefined,
      });

      if (response?.success || response?.data?.id) {
        Toast.show({ type: 'success', text1: 'Goal created successfully' });
        navigation.goBack();
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not create savings goal'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Create Savings Goal</Text>

      <Input
        label="Goal Name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Rent for 2025"
        icon="flag-outline"
        error={errors.name}
      />

      <Input
        label="Target Amount (NGN)"
        value={targetAmount}
        onChangeText={setTargetAmount}
        placeholder="e.g. 500000"
        keyboardType="numeric"
        icon="cash-outline"
        error={errors.targetAmount}
      />

      <Input
        label="Target Date (optional)"
        value={targetDate}
        onChangeText={setTargetDate}
        placeholder="e.g. 2025-12-31"
        icon="calendar-outline"
      />

      <Input
        label="Description (optional)"
        value={description}
        onChangeText={setDescription}
        placeholder="What is this savings goal for?"
        multiline
        numberOfLines={4}
      />

      <Button
        title="Create Goal"
        onPress={handleCreate}
        loading={submitting}
        style={styles.submitBtn}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 24 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 20 },
  submitBtn: { marginTop: 10 },
});

export default SavingsGoalCreateScreen;
