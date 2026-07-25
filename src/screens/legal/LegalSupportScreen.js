import React, { useEffect, useLayoutEffect, useState } from 'react';
import {ActivityIndicator, StyleSheet TextInput, View} from 'react-native';
import Toast from 'react-native-toast-message';
import { legalService } from '../../services/legalService';
import { getErrorMessage, pickList, pickObject } from '../../utils/http';
import { colors, radius, typography } from '../../theme';
import Button from '../../components/common/Button';
import {

import AppText from '../../components/common/AppText';  DashboardHero,
  DashboardNotice,
  DashboardScreen,
  DashboardSection,
} from '../../components/dashboard/DashboardKit';

const urgencyOptions = ['normal', 'urgent', 'emergency'];

const LegalSupportScreen = ({ navigation }) => {
  const [coverage, setCoverage] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    subject: '',
    description: '',
    urgency: 'normal',
  });

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadLegalSupport = async () => {
    setLoading(true);
    try {
      const [coverageRes, requestsRes] = await Promise.all([
        legalService.getCoverageStatus(),
        legalService.getMySupportRequests(),
      ]);
      setCoverage(pickObject(coverageRes, ['data']));
      setRequests(pickList(requestsRes, ['data']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Legal support unavailable',
        text2: getErrorMessage(error, 'Could not load legal support'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLegalSupport();
  }, []);

  const submitRequest = async () => {
    if (!form.subject.trim() || !form.description.trim()) {
      Toast.show({ type: 'info', text1: 'Subject and description are required' });
      return;
    }

    setSubmitting(true);
    try {
      await legalService.submitSupportRequest(form);
      setForm({ subject: '', description: '', urgency: 'normal' });
      Toast.show({ type: 'success', text1: 'Legal request submitted' });
      await loadLegalSupport();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Request failed',
        text2: getErrorMessage(error, 'Could not submit legal request'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardScreen refreshing={loading} onRefresh={loadLegalSupport}>
      <DashboardHero
        eyebrow="LEGAL PROTECTION"
        title="Legal support"
        subtitle="Check your coverage, submit a legal assistance request and track past requests."
        icon="shield-checkmark-outline"
        onRefresh={loadLegalSupport}
      />

      <DashboardNotice
        title={coverage?.has_coverage ? 'Coverage active' : 'Coverage not active'}
        message={
          coverage?.has_coverage
            ? 'You can submit a request and RentalHub will connect it to legal support.'
            : 'Legal Protection Coverage is required before submitting legal assistance requests.'
        }
        variant={coverage?.has_coverage ? 'info' : 'warning'}
      />

      {coverage?.has_coverage ? (
        <DashboardSection title="Request legal assistance">
          <TextInput
            placeholder="Subject"
            placeholderTextColor={colors.muted}
            value={form.subject}
            onChangeText={(value) => setForm((prev) => ({ ...prev, subject: value }))}
            style={styles.input}
          />
          <TextInput
            multiline
            placeholder="Describe your legal issue"
            placeholderTextColor={colors.muted}
            value={form.description}
            onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))}
            style={[styles.input, styles.textArea]}
          />
          <View style={styles.urgencyRow}>
            {urgencyOptions.map((option) => (
              <AppText 
                key={option}
                onPress={() => setForm((prev) => ({ ...prev, urgency: option }))}
                style={[
                  styles.urgencyPill,
                  form.urgency === option && styles.urgencyPillActive,
                ]}
              >
                {option}
              </AppText>
            ))}
          </View>
          <Button title="Submit request" loading={submitting} onPress={submitRequest} />
        </DashboardSection>
      ) : null}

      <DashboardSection title="Your requests">
        {loading && !requests.length ? <ActivityIndicator color={colors.blue} /> : null}
        {!loading && !requests.length ? (
          <AppText style={styles.empty}>No legal assistance requests yet.</AppText>
        ) : null}
        {requests.map((request) => (
          <View key={String(request.id)} style={styles.requestCard}>
            <View style={styles.requestTop}>
              <AppText style={styles.requestTitle}>{request.subject}</AppText>
              <AppText style={styles.statusPill}>{request.status || 'pending'}</AppText>
            </View>
            <AppText style={styles.requestDescription}>{request.description}</AppText>
            {request.assigned_lawyer_name ? (
              <AppText style={styles.requestMeta}>Assigned to {request.assigned_lawyer_name}</AppText>
            ) : null}
          </View>
        ))}
      </DashboardSection>
    </DashboardScreen>
  );
};

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: typography.regular,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  textArea: {
    minHeight: 110,
    paddingTop: 13,
    textAlignVertical: 'top',
  },
  urgencyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  urgencyPill: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    color: colors.text,
    fontFamily: typography.semibold,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 8,
    textTransform: 'capitalize',
  },
  urgencyPillActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
    color: colors.white,
  },
  requestCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 14,
  },
  requestTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  requestTitle: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.bold,
    fontSize: 14,
  },
  statusPill: {
    backgroundColor: colors.surfaceBlue,
    borderRadius: radius.pill,
    color: colors.blue,
    fontFamily: typography.semibold,
    fontSize: 13,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
    textTransform: 'capitalize',
  },
  requestDescription: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  requestMeta: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 8,
  },
  empty: {
    color: colors.muted,
    fontFamily: typography.regular,
  },
});

export default LegalSupportScreen;
