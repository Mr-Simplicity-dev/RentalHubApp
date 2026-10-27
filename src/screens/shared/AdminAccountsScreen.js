import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import {
  PremiumButton,
  PremiumCard,
  PremiumHero,
  PremiumSectionTitle,
} from '../../components/common/PremiumLayout';
import { adminAccountsService } from '../../services/adminAccountsService';
import { getErrorMessage } from '../../utils/http';
import { colors, radius, typography, typeScale } from '../../theme';
import AppText from '../../components/common/AppText';

const ADMIN_ROLE_OPTIONS = [
  { value: 'lga_admin', get "label"() { return ui("LGA Admin"); } },
  { value: 'state_admin', get "label"() { return ui("State Admin"); } },
  { value: 'zonal_admin', get "label"() { return ui("Zonal Admin"); } },
  { value: 'lga_financial_admin', get "label"() { return ui("LGA Financial Admin"); } },
  { value: 'state_financial_admin', get "label"() { return ui("State Financial Admin"); } },
  { value: 'zonal_financial_admin', get "label"() { return ui("Zonal Financial Admin"); } },
  { value: 'zonal_lawyer', get "label"() { return ui("Zonal Lawyer"); } },
  { value: 'zonal_fumigation_admin', get "label"() { return ui("Zonal Fumigation Admin"); } },
  { value: 'zonal_transportation_admin', get "label"() { return ui("Zonal Transportation Admin"); } },
  { value: 'lga_support_admin', get "label"() { return ui("LGA Support Admin"); } },
  { value: 'state_support_admin', get "label"() { return ui("State Support Admin"); } },
  { value: 'lga_fumigation_admin', get "label"() { return ui("LGA Fumigation Admin"); } },
  { value: 'state_fumigation_admin', get "label"() { return ui("State Fumigation Admin"); } },
  { value: 'lga_transportation_admin', get "label"() { return ui("LGA Transportation Admin"); } },
  { value: 'state_transportation_admin', get "label"() { return ui("State Transportation Admin"); } },
  { value: 'recruitment_admin', get "label"() { return ui("Recruitment Admin"); } },
  { value: 'marketing_agent', get "label"() { return ui("Marketing Agent"); } },
];

const AdminAccountsScreen = () => {
  useInterfaceLanguage();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    user_type: 'state_admin',
    assigned_state: '',
    assigned_city: '',
  });
  const [reminderUserId, setReminderUserId] = useState('');
  const [busy, setBusy] = useState(false);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [error, setError] = useState('');

  const setField = (key) => (value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submitCreate = async () => {
    const { full_name, email, phone, password, user_type, assigned_state, assigned_city } = form;
    if (!full_name || !email || !phone || !password || !user_type) {
      setError('Fill in all required fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const response = await adminAccountsService.createAdmin({
        full_name: full_name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        user_type,
        assigned_state: assigned_state.trim() || undefined,
        assigned_city: assigned_city.trim() || undefined,
      });
      if (response?.success) {
        Toast.show({ type: 'success', text1: ui("Admin account created") });
        setForm({
          full_name: '',
          email: '',
          phone: '',
          password: '',
          user_type: 'state_admin',
          assigned_state: '',
          assigned_city: '',
        });
      } else {
        setError(response?.message || 'Could not create the account.');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create the account.'));
    } finally {
      setBusy(false);
    }
  };

  const sendReminder = async () => {
    const id = Number(reminderUserId);
    if (!Number.isInteger(id) || id < 1) {
      setError('Enter a valid user ID to remind.');
      return;
    }
    setReminderBusy(true);
    setError('');
    try {
      const response = await adminAccountsService.sendVerificationReminder(id);
      if (response?.success) {
        Toast.show({ type: 'success', text1: ui("Reminder sent") });
        setReminderUserId('');
      } else {
        setError(response?.message || 'Could not send the reminder.');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Could not send the reminder.'));
    } finally {
      setReminderBusy(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <PremiumHero
        eyebrow={ui("Super admin")}
        title={ui("Admin accounts")}
        subtitle={ui("Create admin accounts and nudge users to complete identity verification.")}
        icon="shield-checkmark-outline"
      />

      <PremiumSectionTitle title={ui("Create admin account")} />
      <PremiumCard>
        <Input label={ui("Full name")} value={form.full_name} onChangeText={setField('full_name')} />
        <Input
          label={ui("Email")}
          value={form.email}
          onChangeText={setField('email')}
          keyboardType="email-address"
          containerStyle={styles.fieldGap}
        />
        <Input
          label={ui("Phone")}
          value={form.phone}
          onChangeText={setField('phone')}
          keyboardType="phone-pad"
          containerStyle={styles.fieldGap}
        />
        <Input
          label={ui("Role")}
          value={form.user_type}
          onChangeText={setField('user_type')}
          containerStyle={styles.fieldGap}
        />
        <View style={styles.roleChips}>
          {ADMIN_ROLE_OPTIONS.map((option) => {
            const selected = form.user_type === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                activeOpacity={0.85}
                onPress={() => setForm((prev) => ({ ...prev, user_type: option.value }))}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <AppText style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {option.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
        <Input
          label={ui("Assigned state")}
          value={form.assigned_state}
          onChangeText={setField('assigned_state')}
          placeholder={ui("e.g. Lagos")}
          containerStyle={styles.fieldGap}
        />
        <Input
          label={ui("Assigned LGA/city (optional)")}
          value={form.assigned_city}
          onChangeText={setField('assigned_city')}
          containerStyle={styles.fieldGap}
        />
        <Input
          label={ui("Temporary password (min 8 chars)")}
          value={form.password}
          onChangeText={setField('password')}
          secureTextEntry
          containerStyle={styles.fieldGap}
        />
        {error ? <AppText style={styles.error}>{error}</AppText> : null}
        <PremiumButton
          title={ui("Create admin account")}
          onPress={submitCreate}
          loading={busy}
          icon="person-add-outline"
          style={styles.submit}
        />
      </PremiumCard>

      <PremiumSectionTitle title={ui("Verification reminder")} />
      <PremiumCard>
        <Input
          label={ui("User ID")}
          value={reminderUserId}
          onChangeText={(value) => {
            setReminderUserId(value.replace(/\D/g, ''));
            setError('');
          }}
          placeholder={ui("Enter the user's numeric ID")}
          keyboardType="number-pad"
        />
        <PremiumButton
          title={ui("Send verification reminder")}
          onPress={sendReminder}
          loading={reminderBusy}
          icon="notifications-outline"
          style={styles.submit}
        />
      </PremiumCard>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: 18,
    paddingBottom: 36,
  },
  fieldGap: {
    marginTop: 12,
  },
  roleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  chip: {
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipSelected: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  chipText: {
    color: colors.text,
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  chipTextSelected: {
    color: colors.white,
  },
  error: {
    color: colors.danger,
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 10,
  },
  submit: {
    marginTop: 16,
  },
});

export default AdminAccountsScreen;
