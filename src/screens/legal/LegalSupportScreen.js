import {AuthContext} from '../../context/AuthContext';
import {useLanguage} from '../../context/LanguageContext';
const legalCopy=require('../../i18n/legalCasesCopy.cjs');
import React, { useContext, useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import TextInput from '../../components/common/AppTextInput';
import Toast from 'react-native-toast-message';
import { legalService } from '../../services/legalService';
import { getErrorMessage, pickList, pickObject } from '../../utils/http';
import { colors, radius, typography, typeScale } from '../../theme';
import Button from '../../components/common/Button';
import AppText from '../../components/common/AppText';
import {
ActionRow,
DashboardHero,
  DashboardNotice,
  DashboardScreen,
  DashboardSection,
} from '../../components/dashboard/DashboardKit';

const urgencyOptions = ['normal', 'urgent', 'emergency'];

const LegalSupportScreen = ({ navigation }) => {
  const {isAuthenticated}=useContext(AuthContext);
  const {language}=useLanguage();
  const copy=legalCopy[language]||legalCopy.en;
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
    navigation.setOptions({ headerShown: navigation.canGoBack() });
  }, [navigation]);

  const loadLegalSupport = async () => {
    if(!isAuthenticated){setCoverage(null);setRequests([]);setLoading(false);return;}
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
        text1: 'Assistance unavailable',
        text2: getErrorMessage(error, 'Could not load assistance'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLegalSupport();
  }, [isAuthenticated]);

  const refreshLegalSupport=()=>{loadLegalSupport();};

  const submitRequest = async () => {
    if(!isAuthenticated)return;
    if (!form.subject.trim() || !form.description.trim()) {
      Toast.show({ type: 'info', text1: 'Subject and description are required' });
      return;
    }

    setSubmitting(true);
    try {
      await legalService.submitSupportRequest(form);
      setForm({ subject: '', description: '', urgency: 'normal' });
      Toast.show({ type: 'success', text1: 'Assistance request submitted' });
      await loadLegalSupport();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Request failed',
        text2: getErrorMessage(error, 'Could not submit assistance request'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardScreen refreshing={loading} onRefresh={refreshLegalSupport}>
      <DashboardHero

        title={copy.assistance_title}
        subtitle={copy.assistance_intro}
        icon="shield-checkmark-outline"
        onRefresh={refreshLegalSupport}
      />


      {isAuthenticated ? <>
      <DashboardNotice
        title={coverage?.has_coverage ? copy.coverage_active : copy.coverage_required}
        message={
          coverage?.has_coverage
            ? copy.coverage_active_desc
            : copy.coverage_required_desc
        }
        variant={coverage?.has_coverage ? 'info' : 'warning'}
      />

      {!loading && !coverage?.has_coverage ? <DashboardSection title={copy.coverage_required}><ActionRow title={copy.coverage_enquiry} icon="help-circle-outline" onPress={()=>navigation.navigate('Support')}/></DashboardSection> : null}
      {coverage?.has_coverage ? (
        <DashboardSection title={copy.request}>
          <TextInput
            placeholder="Subject"
            placeholderTextColor={colors.muted}
            value={form.subject}
            onChangeText={(value) => setForm((prev) => ({ ...prev, subject: value }))}
            style={styles.input}
          />
          <TextInput
            multiline
            placeholder="Describe your issue"
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
          <AppText style={styles.empty}>No assistance requests yet.</AppText>
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
      </> : <DashboardSection title={copy.assistance}><ActionRow title={copy.sign_in} icon="log-in-outline" onPress={()=>navigation.navigate('Login')}/></DashboardSection>}
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
    fontSize: typeScale.sm,
    lineHeight: 20,
  },
  statusPill: {
    backgroundColor: colors.surfaceBlue,
    borderRadius: radius.pill,
    color: colors.blue,
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
    textTransform: 'capitalize',
  },
  requestDescription: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: typeScale.reading,
    lineHeight: 22,
    marginTop: 8,
  },
  requestMeta: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 8,
  },
  empty: {
    color: colors.muted,
    fontFamily: typography.regular,
  },
});

export default LegalSupportScreen;
