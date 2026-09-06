import React, { useEffect, useMemo, useRef, useState } from 'react';
import {ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import recruitmentService from '../../services/recruitmentService';
import { getErrorMessage } from '../../utils/http';
import { PremiumHero } from '../../components/common/PremiumLayout';
import { colors, radius, shadows, typography } from '../../theme';

import AppText from '../../components/common/AppText';
import TurnstileWidget from '../../components/common/TurnstileWidget';
const emptyForm = {
  full_name: '',
  phone_number: '',
  email_address: '',
  state_name: '',
  lga_name: '',
  area_locality: '',
  residential_address: '',
  highest_education: '',
  years_of_experience: '',
  current_employment_status: '',
  skills_qualifications: '',
  suitability_reason: '',
  application_track: 'standard',
};

const CareersScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [roles, setRoles] = useState([]);
  const [states, setStates] = useState([]);
  const [lgas, setLgas] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [submittedApplication, setSubmittedApplication] = useState(null);
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupReference, setLookupReference] = useState('');
  const [applications, setApplications] = useState([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [error, setError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [statusRes, cyclesRes, rolesRes, statesRes] = await Promise.all([
        recruitmentService.getStatus(),
        recruitmentService.getActiveCycles(),
        recruitmentService.getActiveRoles(),
        recruitmentService.getStates(),
      ]);

      setStatus(statusRes?.data?.data || statusRes?.data || null);
      setCycles(cyclesRes?.data?.data || []);
      setRoles(rolesRes?.data?.data || []);
      setStates(statesRes?.data?.data || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load recruitment information'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const loadLgas = async () => {
      if (!form.state_name) {
        setLgas([]);
        return;
      }

      try {
        const response = await recruitmentService.getLGAs(form.state_name);
        setLgas(response?.data?.data || []);
      } catch (err) {
        setLgas([]);
      }
    };

    loadLgas();
  }, [form.state_name]);

  const selectedRole = useMemo(
    () => roles.find((role) => String(role.id) === String(selectedRoleId)) || null,
    [roles, selectedRoleId]
  );

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!selectedRoleId) {
      Toast.show({ type: 'error', text1: 'Choose a role', text2: 'Pick a role before submitting your application.' });
      return;
    }

    if (!turnstileToken) {
      Toast.show({ type: 'error', text1: 'Security check required', text2: 'Please complete the security check before submitting.' });
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const payload = {
        role_id: Number(selectedRoleId),
        full_name: form.full_name,
        phone_number: form.phone_number,
        email_address: form.email_address,
        state_name: form.state_name,
        lga_name: form.lga_name,
        area_locality: form.area_locality,
        residential_address: form.residential_address,
        highest_education: form.highest_education,
        years_of_experience: Number(form.years_of_experience || 0),
        current_employment_status: form.current_employment_status,
        skills_qualifications: form.skills_qualifications,
        suitability_reason: form.suitability_reason,
        application_track: form.application_track,
        turnstile_token: turnstileToken,
      };

      const response = await recruitmentService.createApplication(payload);
      const data = response?.data?.data;
      setSubmittedApplication(data);
      setLookupEmail(data?.email_address || form.email_address);
      setLookupReference(data?.reference_number || '');
      Toast.show({ type: 'success', text1: 'Application started', text2: 'Your application is ready for payment and document upload.' });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Submission failed', text2: getErrorMessage(err, 'Could not submit your application') });
    } finally {
      turnstileRef.current?.reset();
      setTurnstileToken('');
      setSubmitting(false);
    }
  };

  const lookupApplications = async () => {
    if (!lookupEmail.trim() || !lookupReference.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Email and reference needed',
        text2: 'Enter the email and application reference shown when you applied.',
      });
      return;
    }

    try {
      setLookupLoading(true);
      const response = await recruitmentService.getMyApplications({
        email: lookupEmail.trim(),
        referenceNumber: lookupReference.trim().toUpperCase(),
      });
      setApplications(response?.data?.data || []);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Lookup failed', text2: getErrorMessage(err, 'Could not load applications') });
    } finally {
      setLookupLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.blue} />
        <AppText style={styles.centerText}>Loading careers portal...</AppText>
      </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <PremiumHero
        eyebrow="Careers"
        title="Join RentalHub"
        subtitle="Apply for available roles and track your progress from a polished mobile portal."
        icon="briefcase-outline"
      />

      <View style={styles.noticeCard}>
        <AppText style={styles.noticeTitle}>{status?.is_active ? 'Recruitment is open' : 'Recruitment is currently closed'}</AppText>
        <AppText style={styles.noticeText}>
          {status?.message || (status?.is_active ? 'Applications are currently being accepted.' : 'Please check back later for the next opportunities.')}
        </AppText>
      </View>

      {error ? <AppText style={styles.errorText}>{error}</AppText> : null}

      <AppText style={styles.sectionTitle}>Choose a role</AppText>
      {roles.length > 0 ? (
        <View style={styles.roleGrid}>
          {roles.map((role) => {
            const active = String(role.id) === String(selectedRoleId);
            return (
              <TouchableOpacity
                key={role.id}
                style={[styles.roleCard, active && styles.roleCardActive]}
                onPress={() => setSelectedRoleId(role.id)}
              >
                <AppText style={[styles.roleTitle, active && styles.roleTitleActive]}>{role.title}</AppText>
                <AppText style={styles.roleMeta}>{role.type || 'Role'}</AppText>
                <AppText style={styles.roleMeta}>â‚¦{Number(role.application_fee || 0).toLocaleString()} standard</AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <AppText style={styles.emptyText}>No active roles are available right now.</AppText>
      )}

      {selectedRole ? (
        <View style={styles.selectionCard}>
          <AppText style={styles.selectionTitle}>Selected role</AppText>
          <AppText style={styles.selectionText}>{selectedRole.title}</AppText>
          <AppText style={styles.roleMeta}>{selectedRole.description || 'A professional role in the RentalHub team.'}</AppText>
        </View>
      ) : null}

      <AppText style={styles.sectionTitle}>Your details</AppText>
      <View style={styles.formCard}>
        <TextInput style={styles.input} placeholder="Full name" value={form.full_name} onChangeText={(v) => updateField('full_name', v)} />
        <TextInput style={styles.input} placeholder="Phone number" value={form.phone_number} onChangeText={(v) => updateField('phone_number', v)} keyboardType="phone-pad" />
        <TextInput style={styles.input} placeholder="Email address" value={form.email_address} onChangeText={(v) => updateField('email_address', v)} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Highest education" value={form.highest_education} onChangeText={(v) => updateField('highest_education', v)} />
        <TextInput style={styles.input} placeholder="Current employment status" value={form.current_employment_status} onChangeText={(v) => updateField('current_employment_status', v)} />
        <TextInput style={styles.input} placeholder="Years of experience" value={form.years_of_experience} onChangeText={(v) => updateField('years_of_experience', v)} keyboardType="numeric" />
        <TextInput style={styles.input} placeholder="Area / locality" value={form.area_locality} onChangeText={(v) => updateField('area_locality', v)} />
        <TextInput style={styles.input} placeholder="Residential address" value={form.residential_address} onChangeText={(v) => updateField('residential_address', v)} multiline />
        <TextInput style={[styles.input, styles.textarea]} placeholder="Skills and qualifications" value={form.skills_qualifications} onChangeText={(v) => updateField('skills_qualifications', v)} multiline />
        <TextInput style={[styles.input, styles.textarea]} placeholder="Why you are suitable for this role" value={form.suitability_reason} onChangeText={(v) => updateField('suitability_reason', v)} multiline />

        <AppText style={styles.helperLabel}>Application track</AppText>
        <View style={styles.trackRow}>
          {['standard', 'premium'].map((track) => {
            const active = form.application_track === track;
            return (
              <TouchableOpacity
                key={track}
                style={[styles.trackButton, active && styles.trackButtonActive]}
                onPress={() => updateField('application_track', track)}
              >
                <AppText style={[styles.trackText, active && styles.trackTextActive]}>{track === 'standard' ? 'Standard' : 'Premium'}</AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        <AppText style={styles.helperLabel}>State</AppText>
        <View style={styles.chipRow}>
          {states.map((state) => {
            const active = form.state_name === (state.displayName || state.name);
            return (
              <TouchableOpacity
                key={state.name || state.displayName}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => updateField('state_name', state.displayName || state.name)}
              >
                <AppText style={[styles.chipText, active && styles.chipTextActive]}>{state.displayName || state.name}</AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        {form.state_name ? (
          <>
            <AppText style={styles.helperLabel}>LGA</AppText>
            <View style={styles.chipRow}>
              {lgas.length > 0 ? lgas.map((lga) => {
                const active = form.lga_name === lga;
                return (
                  <TouchableOpacity
                    key={lga}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => updateField('lga_name', lga)}
                  >
                    <AppText style={[styles.chipText, active && styles.chipTextActive]}>{lga}</AppText>
                  </TouchableOpacity>
                );
              }) : <AppText style={styles.emptyText}>No LGAs available for this state.</AppText>}
            </View>
          </>
        ) : null}

        <TurnstileWidget
        action="rentalhub_careers"
          ref={turnstileRef}
          onToken={setTurnstileToken}
          onExpire={() => setTurnstileToken('')}
          onError={() => setTurnstileToken('')}
        />

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#ffffff" /> : <AppText style={styles.submitButtonText}>Submit application</AppText>}
        </TouchableOpacity>
      </View>

      {submittedApplication ? (
        <View style={styles.successCard}>
          <AppText style={styles.successTitle}>Application started</AppText>
          <AppText style={styles.successText}>Reference: {submittedApplication.reference_number}</AppText>
          <AppText style={styles.successText}>Status: {submittedApplication.status}</AppText>
          <AppText style={styles.successText}>Next: complete payment and upload your supporting documents.</AppText>
        </View>
      ) : null}

      <AppText style={styles.sectionTitle}>Check your applications</AppText>
      <View style={styles.lookupCard}>
        <TextInput style={styles.input} placeholder="Enter your email" value={lookupEmail} onChangeText={setLookupEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextInput
          style={styles.input}
          placeholder="Application reference (RH-APP-...)"
          value={lookupReference}
          onChangeText={setLookupReference}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.secondaryButton} onPress={lookupApplications} disabled={lookupLoading}>
          {lookupLoading ? <ActivityIndicator color="#0284c7" /> : <AppText style={styles.secondaryButtonText}>Lookup applications</AppText>}
        </TouchableOpacity>
        {applications.map((application) => {
          const canStartInterview = String(application.status || '').toLowerCase() === 'shortlisted';
          return (
            <View key={application.id} style={styles.applicationRow}>
              <AppText style={styles.applicationTitle}>{application.role_title || 'Application'}</AppText>
              <AppText style={styles.roleMeta}>Status: {application.status}</AppText>
              <AppText style={styles.roleMeta}>Reference: {application.reference_number}</AppText>
              <TouchableOpacity
                style={styles.interviewButton}
                onPress={() => navigation.navigate('RecruitmentApplication', {
                  application,
                  applicationId: application.id,
                  email: application.email_address,
                  referenceNumber: application.reference_number,
                })}
              >
                <AppText style={styles.interviewButtonText}>Open application</AppText>
              </TouchableOpacity>
              {canStartInterview ? (
                <TouchableOpacity
                  style={[styles.interviewButton, styles.interviewSecondaryButton]}
                  onPress={() => navigation.navigate('Interview', {
                    applicationId: application.id,
                    phoneNumber: application.phone_number,
                    email: application.email_address,
                    referenceNumber: application.reference_number,
                  })}
                >
                  <AppText style={styles.interviewSecondaryButtonText}>Start interview</AppText>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 18, paddingBottom: 34 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface },
  centerText: { marginTop: 8, color: colors.muted, fontFamily: typography.medium },
  title: { fontSize: 32, fontFamily: typography.bold, color: colors.ink },
  subtitle: { color: colors.muted, fontFamily: typography.regular, marginTop: 6, marginBottom: 12 },
  noticeCard: {
    backgroundColor: colors.surfaceBlue,
    borderColor: '#CFE2FF',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 16,
    ...shadows.soft,
  },
  noticeTitle: { color: colors.blue, fontSize: 16, fontFamily: typography.bold },
  noticeText: { color: colors.navySoft, fontFamily: typography.regular, marginTop: 4, lineHeight: 20 },
  sectionTitle: { fontSize: 18, fontFamily: typography.bold, color: colors.ink, marginBottom: 10, marginTop: 6 },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  roleCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 13,
    ...shadows.soft,
  },
  roleCardActive: { borderColor: colors.blue, backgroundColor: colors.surfaceBlue },
  roleTitle: { color: colors.ink, fontFamily: typography.bold },
  roleTitleActive: { color: colors.blue },
  roleMeta: { color: colors.muted, fontFamily: typography.regular, fontSize: 13, marginTop: 4 },
  selectionCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 12, ...shadows.soft },
  selectionTitle: { fontFamily: typography.bold, color: colors.ink },
  selectionText: { color: colors.blue, marginTop: 4, fontFamily: typography.semibold },
  formCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: colors.border, ...shadows.soft },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 10,
    color: colors.ink,
    fontFamily: typography.regular,
    backgroundColor: colors.white,
  },
  textarea: { minHeight: 86, textAlignVertical: 'top' },
  helperLabel: { color: colors.text, fontSize: 13, fontFamily: typography.semibold, marginBottom: 6, marginTop: 4 },
  trackRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  trackButton: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  trackButtonActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  trackText: { color: colors.text, fontSize: 13, fontFamily: typography.semibold },
  trackTextActive: { color: colors.white },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 8 },
  chipActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { color: colors.text, fontSize: 13, fontFamily: typography.semibold },
  chipTextActive: { color: colors.white },
  submitButton: { backgroundColor: colors.blue, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  submitButtonText: { color: colors.white, fontFamily: typography.bold },
  secondaryButton: { borderWidth: 1, borderColor: colors.blue, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' },
  secondaryButtonText: { color: colors.blue, fontFamily: typography.bold },
  successCard: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderWidth: 1, borderRadius: radius.md, padding: 14, marginTop: 12 },
  successTitle: { color: colors.success, fontFamily: typography.bold },
  successText: { color: '#065F46', fontFamily: typography.regular, marginTop: 4 },
  lookupCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: colors.border, marginTop: 12, ...shadows.soft },
  applicationRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 10 },
  applicationTitle: { color: colors.ink, fontFamily: typography.bold },
  interviewButton: { backgroundColor: colors.blue, borderRadius: radius.sm, alignItems: 'center', marginTop: 10, paddingVertical: 11 },
  interviewButtonText: { color: colors.white, fontFamily: typography.bold, fontSize: 13 },
  interviewSecondaryButton: { backgroundColor: colors.white, borderColor: colors.blue, borderWidth: 1 },
  interviewSecondaryButtonText: { color: colors.blue, fontFamily: typography.bold, fontSize: 13 },
  emptyText: { color: colors.muted, fontFamily: typography.regular, marginBottom: 10 },
  errorText: { color: colors.danger, marginBottom: 10, fontFamily: typography.semibold },
});

export default CareersScreen;
