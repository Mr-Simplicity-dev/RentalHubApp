import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { applicationService } from '../../services/applicationService';
import { rentSavingsService } from '../../services/rentSavingsService';
import { getErrorMessage, pickList } from '../../utils/http';

const formatCurrency = (value) => `NGN ${Number(value || 0).toLocaleString()}`;

const SavingsGoalCreateScreen = ({ navigation }) => {
  const [applications, setApplications] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [rentDueDate, setRentDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const loadEligibleProperties = async () => {
      try {
        const response = await applicationService.getMyApplications({ limit: 100 });
        const rows = pickList(response, ['data', 'applications']);
        setApplications(rows.filter((item) =>
          ['approved', 'accepted'].includes(String(item.status || '').toLowerCase())
        ));
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Failed',
          text2: getErrorMessage(error, 'Could not load approved properties'),
        });
      } finally {
        setLoadingProperties(false);
      }
    };

    loadEligibleProperties();
  }, []);

  const selectedApplication = useMemo(
    () => applications.find((item) => String(item.property_id) === String(selectedPropertyId)),
    [applications, selectedPropertyId]
  );

  const validate = () => {
    const nextErrors = {};
    if (!selectedApplication) nextErrors.property = 'Select an approved property';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rentDueDate)) {
      nextErrors.rentDueDate = 'Enter the date as YYYY-MM-DD';
    } else if (new Date(`${rentDueDate}T00:00:00`) <= new Date()) {
      nextErrors.rentDueDate = 'Rent due date must be in the future';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const response = await rentSavingsService.createSavingsPlan({
        property_id: selectedApplication.property_id,
        rent_due_date: rentDueDate,
        monthly_rent_amount: Number(selectedApplication.rent_amount),
      });

      if (response?.success || response?.data?.id) {
        Toast.show({ type: 'success', text1: 'Savings plan created' });
        navigation.goBack();
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not create savings plan'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Create Savings Plan</Text>
      <Text style={styles.sectionLabel}>Approved property</Text>

      {applications.map((item) => {
        const selected = String(item.property_id) === String(selectedPropertyId);
        return (
          <TouchableOpacity
            key={item.id}
            style={[styles.propertyCard, selected && styles.propertyCardSelected]}
            onPress={() => setSelectedPropertyId(item.property_id)}
          >
            <Text style={styles.propertyTitle}>{item.property_title || 'Rental property'}</Text>
            <Text style={styles.propertyMeta}>
              {[item.area, item.city, item.state_name].filter(Boolean).join(', ')}
            </Text>
            <Text style={styles.propertyRent}>{formatCurrency(item.rent_amount)}</Text>
          </TouchableOpacity>
        );
      })}

      {!loadingProperties && applications.length === 0 ? (
        <Text style={styles.empty}>
          No approved rental application is available for a savings plan.
        </Text>
      ) : null}
      {errors.property ? <Text style={styles.error}>{errors.property}</Text> : null}

      <Input
        label="Rent Due Date"
        value={rentDueDate}
        onChangeText={setRentDueDate}
        placeholder="YYYY-MM-DD"
        icon="calendar-outline"
        error={errors.rentDueDate}
      />

      {selectedApplication ? (
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Savings target</Text>
          <Text style={styles.summaryValue}>
            {formatCurrency(selectedApplication.rent_amount)}
          </Text>
        </View>
      ) : null}

      <Button
        title="Create Plan"
        onPress={handleCreate}
        loading={submitting}
        disabled={loadingProperties || applications.length === 0}
        style={styles.submitBtn}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 24 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 20 },
  sectionLabel: { color: '#334155', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  propertyCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  propertyCardSelected: { borderColor: '#0284c7', backgroundColor: '#f0f9ff' },
  propertyTitle: { color: '#0f172a', fontSize: 15, fontWeight: '700' },
  propertyMeta: { color: '#64748b', fontSize: 12, marginTop: 2 },
  propertyRent: { color: '#0284c7', fontSize: 16, fontWeight: '800', marginTop: 5 },
  empty: { color: '#64748b', marginBottom: 16 },
  error: { color: '#dc2626', fontSize: 12, marginBottom: 10 },
  summary: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
  },
  summaryLabel: { color: '#64748b', fontSize: 12 },
  summaryValue: { color: '#0f172a', fontSize: 22, fontWeight: '800', marginTop: 3 },
  submitBtn: { marginTop: 10 },
});

export default SavingsGoalCreateScreen;
