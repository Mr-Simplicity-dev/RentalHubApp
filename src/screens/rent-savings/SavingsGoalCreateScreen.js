import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import {
  EmptyPanel,
  InfoRow,
  PremiumButton,
  PremiumCard,
  PremiumHero,
  PremiumScreen,
  PremiumSectionTitle,
  StatusPill,
  formatNaira,
} from '../../components/common/PremiumLayout';
import { applicationService } from '../../services/applicationService';
import { rentSavingsService } from '../../services/rentSavingsService';
import { getErrorMessage, pickList } from '../../utils/http';
import { colors, typography } from '../../theme';

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
    <PremiumScreen>
      <PremiumHero
        eyebrow="Rent savings"
        title="Create a savings plan"
        subtitle="Choose an approved property, set a due date, and keep rent progress visible every month."
        icon="wallet-outline"
      />

      <PremiumSectionTitle
        title="Approved property"
        subtitle="Only approved or accepted rental applications can start a rent-savings plan."
      />

      {applications.map((item) => {
        const selected = String(item.property_id) === String(selectedPropertyId);
        return (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.86}
            onPress={() => setSelectedPropertyId(item.property_id)}
          >
            <PremiumCard style={[styles.propertyCard, selected && styles.propertyCardSelected]}>
              <View style={styles.propertyHeader}>
                <View style={styles.propertyCopy}>
                  <Text style={styles.propertyTitle}>{item.property_title || 'Rental property'}</Text>
                  <Text style={styles.propertyMeta}>
                    {[item.area, item.city, item.state_name].filter(Boolean).join(', ') || 'Location not available'}
                  </Text>
                </View>
                {selected ? <StatusPill label="Selected" color={colors.success} /> : null}
              </View>
              <Text style={styles.propertyRent}>{formatNaira(item.rent_amount)}</Text>
            </PremiumCard>
          </TouchableOpacity>
        );
      })}

      {!loadingProperties && applications.length === 0 ? (
        <EmptyPanel
          title="No approved property"
          message="You need an approved rental application before creating a savings plan."
          icon="home-outline"
        />
      ) : null}
      {errors.property ? <Text style={styles.error}>{errors.property}</Text> : null}

      <PremiumCard>
        <Input
          label="Rent due date"
          value={rentDueDate}
          onChangeText={setRentDueDate}
          placeholder="YYYY-MM-DD"
          icon="calendar-outline"
          error={errors.rentDueDate}
        />

        {selectedApplication ? (
          <InfoRow
            icon="flag-outline"
            label="Savings target"
            value={formatNaira(selectedApplication.rent_amount)}
          />
        ) : null}

        <PremiumButton
          title="Create plan"
          onPress={handleCreate}
          loading={submitting}
          disabled={loadingProperties || applications.length === 0}
          icon="checkmark-circle-outline"
          style={styles.submitBtn}
        />
      </PremiumCard>
    </PremiumScreen>
  );
};

const styles = StyleSheet.create({
  propertyCard: {
    marginBottom: 10,
  },
  propertyCardSelected: {
    backgroundColor: colors.surfaceBlue,
    borderColor: colors.blue,
  },
  propertyHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  propertyCopy: {
    flex: 1,
  },
  propertyTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 16,
  },
  propertyMeta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  propertyRent: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 20,
    marginTop: 10,
  },
  error: {
    color: colors.danger,
    fontFamily: typography.medium,
    fontSize: 12,
    marginBottom: 10,
  },
  submitBtn: {
    marginTop: 10,
  },
});

export default SavingsGoalCreateScreen;
