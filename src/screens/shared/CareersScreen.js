import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import recruitmentService from '../../services/recruitmentService';
import { getErrorMessage } from '../../utils/http';

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
  const [applications, setApplications] = useState([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [error, setError] = useState('');

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
      };

      const response = await recruitmentService.createApplication(payload);
      const data = response?.data?.data;
      setSubmittedApplication(data);
      Toast.show({ type: 'success', text1: 'Application started', text2: 'Your application is ready for payment and document upload.' });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Submission failed', text2: getErrorMessage(err, 'Could not submit your application') });
    } finally {
      setSubmitting(false);
    }
  };

  const lookupApplications = async () => {
    if (!lookupEmail.trim()) return;

    try {
      setLookupLoading(true);
      const response = await recruitmentService.getMyApplications(lookupEmail.trim());
      setApplications(response?.data?.data || []);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Lookup failed', text2: getErrorMessage(err, 'Could not load applications') });
    } finally {
      setLookupLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.centerText}>Loading careers portal...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>RentalHub Careers</Text>
      <Text style={styles.subtitle}>Apply for available roles and track your progress from your phone.</Text>

      <View style={styles.noticeCard}>
        <Text style={styles.noticeTitle}>{status?.is_active ? 'Recruitment is open' : 'Recruitment is currently closed'}</Text>
        <Text style={styles.noticeText}>
          {status?.message || (status?.is_active ? 'Applications are currently being accepted.' : 'Please check back later for the next opportunities.')}
        </Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Text style={styles.sectionTitle}>Choose a role</Text>
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
                <Text style={[styles.roleTitle, active && styles.roleTitleActive]}>{role.title}</Text>
                <Text style={styles.roleMeta}>{role.type || 'Role'}</Text>
                <Text style={styles.roleMeta}>₦{Number(role.application_fee || 0).toLocaleString()} standard</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <Text style={styles.emptyText}>No active roles are available right now.</Text>
      )}

      {selectedRole ? (
        <View style={styles.selectionCard}>
          <Text style={styles.selectionTitle}>Selected role</Text>
          <Text style={styles.selectionText}>{selectedRole.title}</Text>
          <Text style={styles.roleMeta}>{selectedRole.description || 'A professional role in the RentalHub team.'}</Text>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Your details</Text>
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

        <Text style={styles.helperLabel}>Application track</Text>
        <View style={styles.trackRow}>
          {['standard', 'premium'].map((track) => {
            const active = form.application_track === track;
            return (
              <TouchableOpacity
                key={track}
                style={[styles.trackButton, active && styles.trackButtonActive]}
                onPress={() => updateField('application_track', track)}
              >
                <Text style={[styles.trackText, active && styles.trackTextActive]}>{track === 'standard' ? 'Standard' : 'Premium'}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.helperLabel}>State</Text>
        <View style={styles.chipRow}>
          {states.map((state) => {
            const active = form.state_name === (state.displayName || state.name);
            return (
              <TouchableOpacity
                key={state.name || state.displayName}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => updateField('state_name', state.displayName || state.name)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{state.displayName || state.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {form.state_name ? (
          <>
            <Text style={styles.helperLabel}>LGA</Text>
            <View style={styles.chipRow}>
              {lgas.length > 0 ? lgas.map((lga) => {
                const active = form.lga_name === lga;
                return (
                  <TouchableOpacity
                    key={lga}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => updateField('lga_name', lga)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{lga}</Text>
                  </TouchableOpacity>
                );
              }) : <Text style={styles.emptyText}>No LGAs available for this state.</Text>}
            </View>
          </>
        ) : null}

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.submitButtonText}>Submit application</Text>}
        </TouchableOpacity>
      </View>

      {submittedApplication ? (
        <View style={styles.successCard}>
          <Text style={styles.successTitle}>Application started</Text>
          <Text style={styles.successText}>Reference: {submittedApplication.reference_number}</Text>
          <Text style={styles.successText}>Status: {submittedApplication.status}</Text>
          <Text style={styles.successText}>Next: complete payment and upload your supporting documents.</Text>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Check your applications</Text>
      <View style={styles.lookupCard}>
        <TextInput style={styles.input} placeholder="Enter your email" value={lookupEmail} onChangeText={setLookupEmail} keyboardType="email-address" autoCapitalize="none" />
        <TouchableOpacity style={styles.secondaryButton} onPress={lookupApplications} disabled={lookupLoading}>
          {lookupLoading ? <ActivityIndicator color="#0284c7" /> : <Text style={styles.secondaryButtonText}>Lookup applications</Text>}
        </TouchableOpacity>
        {applications.map((application) => {
          const canStartInterview = String(application.status || '').toLowerCase() === 'shortlisted';
          return (
            <View key={application.id} style={styles.applicationRow}>
              <Text style={styles.applicationTitle}>{application.role_title || 'Application'}</Text>
              <Text style={styles.roleMeta}>Status: {application.status}</Text>
              <Text style={styles.roleMeta}>Reference: {application.reference_number}</Text>
              {canStartInterview ? (
                <TouchableOpacity
                  style={styles.interviewButton}
                  onPress={() => navigation.navigate('Interview', {
                    applicationId: application.id,
                    phoneNumber: application.phone_number,
                    email: application.email_address,
                    referenceNumber: application.reference_number,
                  })}
                >
                  <Text style={styles.interviewButtonText}>Start interview</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  centerText: { marginTop: 8, color: '#64748b' },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a' },
  subtitle: { color: '#64748b', marginTop: 6, marginBottom: 12 },
  noticeCard: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 16 },
  noticeTitle: { color: '#1d4ed8', fontSize: 16, fontWeight: '700' },
  noticeText: { color: '#1e3a8a', marginTop: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 8, marginTop: 4 },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  roleCard: { width: '48%', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12 },
  roleCardActive: { borderColor: '#0284c7', backgroundColor: '#f0f9ff' },
  roleTitle: { color: '#0f172a', fontWeight: '700' },
  roleTitleActive: { color: '#0284c7' },
  roleMeta: { color: '#64748b', fontSize: 12, marginTop: 4 },
  selectionCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10 },
  selectionTitle: { fontWeight: '700', color: '#0f172a' },
  selectionText: { color: '#0284c7', marginTop: 4, fontWeight: '600' },
  formCard: { backgroundColor: '#ffffff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10, color: '#0f172a' },
  textarea: { minHeight: 86, textAlignVertical: 'top' },
  helperLabel: { color: '#475569', fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  trackRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  trackButton: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  trackButtonActive: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  trackText: { color: '#334155', fontSize: 13, fontWeight: '600' },
  trackTextActive: { color: '#ffffff' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8 },
  chipActive: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  chipText: { color: '#334155', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#ffffff' },
  submitButton: { backgroundColor: '#0284c7', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  submitButtonText: { color: '#ffffff', fontWeight: '700' },
  secondaryButton: { borderWidth: 1, borderColor: '#0284c7', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  secondaryButtonText: { color: '#0284c7', fontWeight: '700' },
  successCard: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 12 },
  successTitle: { color: '#047857', fontWeight: '700' },
  successText: { color: '#065f46', marginTop: 4 },
  lookupCard: { backgroundColor: '#ffffff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', marginTop: 12 },
  applicationRow: { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8, marginTop: 8 },
  applicationTitle: { color: '#0f172a', fontWeight: '700' },
  emptyText: { color: '#64748b', marginBottom: 10 },
  errorText: { color: '#dc2626', marginBottom: 10, fontWeight: '600' },
});

export default CareersScreen;
