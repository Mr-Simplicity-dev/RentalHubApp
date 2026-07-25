import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {ActivityIndicator, Alert, StyleSheet, Switch TextInput, TouchableOpacity, View} from 'react-native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/Ionicons';
import { serviceAdminService } from '../../services/serviceAdminService';
import { getErrorMessage } from '../../utils/http';
import { colors, radius, typography } from '../../theme';
import {

import AppText from '../../components/common/AppText';  DashboardHero,
  DashboardNotice,
  DashboardScreen,
  DashboardSection,
} from '../../components/dashboard/DashboardKit';

const CHECK_ITEMS = [
  ['safety_briefing_completed', 'Safety briefing completed', 'Tenant/provider safety briefing was completed before work started.'],
  ['ppe_used', 'PPE used', 'Team used the required protective equipment.'],
  ['area_secured', 'Area secured', 'Work area was isolated from residents, pets and visitors.'],
  ['warning_signs_posted', 'Warning signs posted', 'Visible safety signs were placed around the work area.'],
  ['ventilation_adequate', 'Ventilation adequate', 'Ventilation was checked and considered safe for the service.'],
  ['msds_available', 'MSDS available', 'Material safety documentation was available where chemicals were used.'],
  ['proper_storage', 'Proper storage', 'Chemicals/tools were stored safely during the work.'],
  ['spill_kit_available', 'Spill kit available', 'Spill response kit was available on site.'],
  ['waste_disposal_proper', 'Waste disposal proper', 'Waste disposal followed the expected safety process.'],
  ['recycling_compliant', 'Recycling compliant', 'Recycling/environmental handling was followed where applicable.'],
];

const buildInitialChecks = () =>
  CHECK_ITEMS.reduce((acc, [key]) => {
    acc[key] = false;
    return acc;
  }, {});

const formatDateInput = () => new Date().toISOString().slice(0, 10);

const FumigationComplianceScreen = ({ navigation, route }) => {
  const booking = route?.params?.booking || {};
  const bookingId = route?.params?.bookingId || booking.id || booking.booking_id;
  const provider = route?.params?.provider || booking.provider || {};
  const providerId = route?.params?.providerId || provider.id || booking.provider_id;
  const [checks, setChecks] = useState(buildInitialChecks);
  const [officerName, setOfficerName] = useState('');
  const [inspectionDate, setInspectionDate] = useState(formatDateInput);
  const [notes, setNotes] = useState('');
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const completionCount = useMemo(
    () => CHECK_ITEMS.filter(([key]) => checks[key]).length,
    [checks]
  );

  const providerName =
    provider.company_name ||
    record?.company_name ||
    booking.provider_name ||
    booking.assigned_team_leader ||
    'Assigned provider';

  const loadRecord = async () => {
    if (!bookingId) return;
    setLoading(true);
    try {
      const response = await serviceAdminService.getFumigationComplianceRecord(bookingId);
      const nextRecord = response?.data || null;
      setRecord(nextRecord);
      if (nextRecord) {
        setChecks((current) =>
          CHECK_ITEMS.reduce((acc, [key]) => {
            acc[key] = Boolean(nextRecord[key]);
            return acc;
          }, { ...current })
        );
        setOfficerName(nextRecord.compliance_officer_name || '');
        setInspectionDate(String(nextRecord.inspection_date || formatDateInput()).slice(0, 10));
        setNotes(nextRecord.notes || '');
      }
    } catch (error) {
      Toast.show({
        type: 'info',
        text1: 'No compliance record loaded',
        text2: getErrorMessage(error, 'You can submit a new safety record.'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecord();
  }, [bookingId]);

  const toggleCheck = (key) => {
    setChecks((current) => ({ ...current, [key]: !current[key] }));
  };

  const submitCompliance = async () => {
    if (!providerId && !record?.provider_id) {
      Alert.alert('Provider required', 'Assign a provider before submitting safety compliance.');
      return;
    }
    if (!officerName.trim()) {
      Alert.alert('Officer required', 'Enter the compliance officer name.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}/.test(inspectionDate)) {
      Alert.alert('Date required', 'Enter inspection date as YYYY-MM-DD.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await serviceAdminService.submitFumigationCompliance(bookingId, {
        provider_id: Number(providerId || record?.provider_id),
        ...checks,
        compliance_officer_name: officerName.trim(),
        inspection_date: inspectionDate,
        notes: notes.trim(),
      });
      setRecord(response?.data || null);
      Toast.show({
        type: 'success',
        text1: 'Compliance submitted',
        text2: 'Safety record saved and booking marked in progress.',
      });
      navigation.goBack();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Submission failed',
        text2: getErrorMessage(error, 'Could not submit compliance record'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardScreen refreshing={loading} onRefresh={loadRecord}>
      <DashboardHero
        eyebrow="SAFETY COMPLIANCE"
        title={`Booking #${bookingId}`}
        subtitle={`Complete the native safety checklist for ${providerName}.`}
        icon="shield-checkmark-outline"
        onRefresh={loadRecord}
      />

      <DashboardNotice
        title={record ? 'Existing record found' : 'Native compliance form'}
        message={
          record
            ? 'A compliance record already exists. You can review or resubmit if the site was inspected again.'
            : 'Submit the inspection checklist from the app after provider assignment and site safety checks.'
        }
      />

      <DashboardSection title={`Checklist ${completionCount}/${CHECK_ITEMS.length}`}>
        {loading ? <ActivityIndicator color={colors.blue} /> : null}
        {CHECK_ITEMS.map(([key, title, subtitle]) => (
          <View key={key} style={styles.checkRow}>
            <View style={styles.checkCopy}>
              <AppText style={styles.checkTitle}>{title}</AppText>
              <AppText style={styles.checkSubtitle}>{subtitle}</AppText>
            </View>
            <Switch
              accessibilityLabel={title}
              value={Boolean(checks[key])}
              onValueChange={() => toggleCheck(key)}
              trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
              thumbColor={checks[key] ? colors.blue : colors.white}
            />
          </View>
        ))}
      </DashboardSection>

      <DashboardSection title="Inspection details">
        <AppText style={styles.label}>Compliance officer</AppText>
        <TextInput
          accessibilityLabel="Compliance officer name"
          value={officerName}
          onChangeText={setOfficerName}
          placeholder="Officer full name"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <AppText style={styles.label}>Inspection date</AppText>
        <TextInput
          accessibilityLabel="Inspection date"
          value={inspectionDate}
          onChangeText={setInspectionDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <AppText style={styles.label}>Notes</AppText>
        <TextInput
          accessibilityLabel="Compliance notes"
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Add inspection observations, risks or handover notes"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.textArea]}
        />
      </DashboardSection>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Submit safety compliance"
        disabled={submitting}
        onPress={submitCompliance}
        style={[styles.submitButton, submitting ? styles.disabled : null]}
      >
        {submitting ? <ActivityIndicator color={colors.white} /> : <Icon name="send-outline" size={18} color={colors.white} />}
        <AppText style={styles.submitText}>{submitting ? 'Submitting...' : 'Submit compliance'}</AppText>
      </TouchableOpacity>
    </DashboardScreen>
  );
};

const styles = StyleSheet.create({
  checkRow: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  checkCopy: {
    flex: 1,
  },
  checkTitle: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  checkSubtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 17,
    marginTop: 3,
  },
  label: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 13,
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: typography.regular,
    fontSize: 14,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 18,
    marginHorizontal: 16,
    paddingVertical: 14,
  },
  disabled: {
    opacity: 0.65,
  },
  submitText: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 14,
  },
});

export default FumigationComplianceScreen;
