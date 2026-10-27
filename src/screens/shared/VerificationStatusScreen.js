import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import TextInput from '../../components/common/AppTextInput';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import Button from '../../components/common/Button';
import { userService } from '../../services/userService';
import { colors, radius, typography, typeScale } from '../../theme';
import { getErrorMessage, pickObject } from '../../utils/http';

import AppText from '../../components/common/AppText';
const VerificationStatusScreen = ({ navigation }) => {
  const interfaceLanguage = useInterfaceLanguage();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [revalidationRequests, setRevalidationRequests] = useState([]);
  const [submittingRevalidation, setSubmittingRevalidation] = useState(false);
  const [revalidationError, setRevalidationError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [revalidationForm, setRevalidationForm] = useState({
    nin: '',
    date_of_birth: '',
    international_passport_number: '',
    nationality: '',
  });

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation, interfaceLanguage]);

  const loadStatus = useCallback(async ({ refresh = false } = {}) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const results = await Promise.allSettled([
        userService.getVerificationStatus(),
        userService.getRevalidationRequests(),
      ]);
      if (results[0].status === 'fulfilled') {
        setStatus(pickObject(results[0].value, ['data']) || results[0].value?.data || {});
      }
      if (results[1].status === 'fulfilled') {
        const list = Array.isArray(results[1].value?.data)
          ? results[1].value.data
          : (results[1].value?.data?.data || []);
        setRevalidationRequests(list);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Could not load verification"),
        text2: getErrorMessage(error, ui("Please try again.")),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const activeRevalidation = useMemo(
    () => revalidationRequests.find((r) => ['requested', 'rejected', 'submitted'].includes(r.status)) || null,
    [revalidationRequests, interfaceLanguage]
  );

  const emailRequired=status?.email_required!==false;
  const requiredCount=emailRequired?3:2;
  const emailVerified = Boolean(status?.email || status?.email_verified);
  const phoneVerified = Boolean(status?.phone || status?.phone_verified);
  const identityVerified = Boolean(status?.identity || status?.identity_verified);
  const reviewStatus =
    status?.review_status || status?.identity_verification_status || 'not_submitted';
  const identityPending = reviewStatus === 'pending' || reviewStatus === 'provider_pending';
  const identityRejected = reviewStatus === 'rejected';
  const identityInProgress = reviewStatus === 'provider_pending';
  const completedCount = [...(emailRequired?[emailVerified]:[]), phoneVerified, identityVerified].filter(Boolean).length;
  const progress = useMemo(() => `${Math.round((completedCount / requiredCount) * 100)}%`, [completedCount,requiredCount, interfaceLanguage]);

  const steps = [
    {
      key: 'email',
      icon: 'mail-outline',
      title: ui("Email address"),
      description: emailVerified ? ui("Your email address is confirmed.") : ui("Confirm your email address."),
      complete: emailVerified,
    },
    {
      key: 'phone',
      icon: 'call-outline',
      title: ui("Phone number"),
      description: phoneVerified ? ui("Your phone number is confirmed.") : ui("Verify your mobile number with an OTP."),
      complete: phoneVerified,
      action: !phoneVerified ? () => navigation.navigate('VerifyPhone') : null,
      actionLabel: ui("Verify phone"),
    },
    {
      key: 'identity',
      icon: 'person-outline',
      title: ui("Identity document"),
      description: identityVerified
        ? ui("Your identity has been verified.")
        : identityInProgress
          ? ui("Your credential is being verified by our identity partner.")
          : identityPending
            ? ui("Your passport photo is waiting for review.")
            : identityRejected
              ? ui("Your submission needs to be replaced.")
              : ui("Submit a live passport photo for review."),
      complete: identityVerified,
      pending: identityPending || identityInProgress,
      rejected: identityRejected,
      action: !identityVerified ? () => navigation.navigate('Profile') : null,
      actionLabel: identityRejected ? ui("Replace photo") : identityPending ? ui("View profile") : ui("Start verification"),
    },
  ].filter(step=>emailRequired||step.key!=='email');

  const requestedFields = activeRevalidation?.requested_fields || [];
  const hasIdentityFields = requestedFields.some((f) => ['nin', 'international_passport'].includes(f));

  const clearFieldErrors = () => setFieldErrors({});

  const validateRevalidationForm = () => {
    const errors = {};
    if (requestedFields.includes('nin')) {
      if (!/^\d{11}$/.test(revalidationForm.nin)) {
        errors.nin = 'Enter a valid 11-digit NIN';
      }
      if (!revalidationForm.date_of_birth) {
        errors.date_of_birth = 'Date of birth is required';
      }
    }
    if (requestedFields.includes('international_passport')) {
      if (!/^[A-Z0-9]{6,20}$/.test(revalidationForm.international_passport_number.trim())) {
        errors.international_passport_number = 'Enter a valid 6-20 character passport number';
      }
      if (revalidationForm.nationality.trim().length < 2) {
        errors.nationality = 'Nationality is required';
      }
      if (!revalidationForm.date_of_birth) {
        errors.date_of_birth = 'Date of birth is required';
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitRevalidation = async () => {
    if (!activeRevalidation) return;
    if (!validateRevalidationForm()) return;

    setSubmittingRevalidation(true);
    setRevalidationError('');
    try {
      await userService.submitRevalidation(activeRevalidation.id, revalidationForm);
      setRevalidationForm({ nin: '', date_of_birth: '', international_passport_number: '', nationality: '' });
      setFieldErrors({});
      await loadStatus({ refresh: true });
      Toast.show({ type: 'success', text1: ui("Credentials submitted"), text2: ui("Awaiting super-admin review.") });
    } catch (error) {
      setRevalidationError(getErrorMessage(error, 'Could not submit credentials'));
    } finally {
      setSubmittingRevalidation(false);
    }
  };

  const inputStyle = (field) => [
    styles.input,
    fieldErrors[field] ? styles.inputError : null,
  ];

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel={ui("Go back")}
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="arrow-back" size={22} color={colors.navy} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <AppText style={styles.eyebrow}>{ui("TRUST AND SAFETY")}</AppText>
          <AppText style={styles.title}>{ui("Verification")}</AppText>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[colors.blue]}
            onRefresh={() => loadStatus({ refresh: true })}
            refreshing={refreshing}
            tintColor={colors.blue}
          />
        }
        showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.blue} size="large" />
            <AppText style={styles.loadingText}>{ui("Checking verification…")}</AppText>
          </View>
        ) : (
          <>
            <View style={[styles.hero, completedCount === requiredCount && styles.heroComplete]}>
              <View style={styles.heroIcon}>
                <Icon
                  name={completedCount === requiredCount ? 'shield-checkmark' : 'shield-outline'}
                  size={27}
                  color={colors.gold}
                />
              </View>
              <AppText style={styles.heroEyebrow}>
                {completedCount === requiredCount ? 'FULLY VERIFIED' : 'ACCOUNT PROGRESS'}
              </AppText>
              <AppText style={styles.heroTitle}>
                {completedCount === requiredCount ? 'Your identity is verified' : ui("{value0} of {value1} steps complete", {value0: (completedCount), value1: (requiredCount)})}
              </AppText>
              <AppText style={styles.heroText}>
                {completedCount === requiredCount
                  ? 'Your verified profile helps create a safer RentalHub community.'
                  : 'Complete verification to unlock the full RentalHub workflow.'}
              </AppText>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: progress }]} />
              </View>
            </View>

            <AppText style={styles.sectionEyebrow}>{ui("VERIFICATION STEPS")}</AppText>
            <View style={styles.stepsCard}>
              {steps.map((step, index) => (
                <View key={step.key}>
                  <View style={styles.step}>
                    <View
                      style={[
                        styles.stepIcon,
                        step.complete && styles.stepIconComplete,
                        step.rejected && styles.stepIconRejected,
                      ]}>
                      <Icon
                        name={step.complete ? 'checkmark' : step.icon}
                        size={19}
                        color={
                          step.complete
                            ? colors.white
                            : step.rejected
                              ? colors.danger
                              : colors.blue
                        }
                      />
                    </View>
                    <View style={styles.stepBody}>
                      <View style={styles.stepHeading}>
                        <AppText style={styles.stepTitle}>{step.title}</AppText>
                        <AppText
                          style={[
                            styles.stepStatus,
                            step.complete && styles.stepStatusComplete,
                            step.pending && styles.stepStatusPending,
                            step.rejected && styles.stepStatusRejected,
                          ]}>
                          {step.complete ? ui("Verified") : identityInProgress ? ui("Processing") : step.pending ? ui("In review") : step.rejected ? 'Action needed' : 'Incomplete'}
                        </AppText>
                      </View>
                      <AppText style={styles.stepText}>{step.description}</AppText>
                      {step.key === 'identity' && status?.identity_document_type ? (
                        <AppText style={styles.documentText}>{ui("Document:")}{String(status.identity_document_type).replace(/_/g, ' ')}
                        </AppText>
                      ) : null}
                      {step.action ? (
                        <TouchableOpacity onPress={step.action} style={styles.stepAction}>
                          <AppText style={styles.stepActionText}>{step.actionLabel}</AppText>
                          <Icon name="arrow-forward" size={15} color={colors.blue} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                  {index < steps.length - 1 ? <View style={styles.divider} /> : null}
                </View>
              ))}
            </View>

            {activeRevalidation && (
              <View style={styles.revalidationCard}>
                <View style={styles.revalidationHeader}>
                  <Icon name="alert-circle-outline" size={20} color={colors.warning} />
                  <AppText style={styles.revalidationTitle}>{ui("Credential Revalidation Required")}</AppText>
                </View>
                <AppText style={styles.revalidationReason}>{activeRevalidation.reason}</AppText>
                {activeRevalidation.instructions ? (
                  <AppText style={styles.revalidationInstructions}>{activeRevalidation.instructions}</AppText>
                ) : null}
                {activeRevalidation.due_at ? (
                  <AppText style={styles.revalidationDue}>{ui("Due:")}{new Date(activeRevalidation.due_at).toLocaleDateString()}
                  </AppText>
                ) : null}
                {activeRevalidation.review_note ? (
                  <View style={styles.reviewNoteCard}>
                    <AppText style={styles.reviewNoteTitle}>{ui("Admin feedback:")}</AppText>
                    <AppText style={styles.reviewNoteText}>{activeRevalidation.review_note}</AppText>
                  </View>
                ) : null}

                {activeRevalidation.status === "submitted" ? (
                  <View style={styles.submittedBanner}>
                    <Icon name="time-outline" size={18} color={colors.blue} />
                    <AppText style={styles.submittedText}>{ui("Credentials submitted. Awaiting super-admin review.")}</AppText>
                  </View>
                ) : (
                  <View style={styles.revalidationForm}>
                    {requestedFields.includes('nin') && (
                      <>
                        <AppText style={styles.fieldLabel}>{ui("11-digit NIN")}</AppText>
                        <TextInput
                          style={inputStyle('nin')}
                          value={revalidationForm.nin}
                          onChangeText={(text) => {
                            clearFieldErrors();
                            setRevalidationForm((prev) => ({ ...prev, nin: text.replace(/[^0-9]/g, '') }));
                          }}
                          maxLength={11}
                          keyboardType="numeric"
                          placeholder={ui("Enter your NIN")}
                          placeholderTextColor={colors.muted}
                        />
                        {fieldErrors.nin ? <AppText style={styles.fieldError}>{fieldErrors.nin}</AppText> : null}
                      </>
                    )}

                    {requestedFields.includes('international_passport') && (
                      <>
                        <AppText style={styles.fieldLabel}>{ui("International Passport Number")}</AppText>
                        <TextInput
                          style={inputStyle('international_passport_number')}
                          value={revalidationForm.international_passport_number}
                          onChangeText={(text) => {
                            clearFieldErrors();
                            setRevalidationForm((prev) => ({ ...prev, international_passport_number: text.toUpperCase() }));
                          }}
                          maxLength={20}
                          autoCapitalize="characters"
                          placeholder="e.g. A12345678"
                          placeholderTextColor={colors.muted}
                        />
                        {fieldErrors.international_passport_number ? <AppText style={styles.fieldError}>{fieldErrors.international_passport_number}</AppText> : null}

                        <AppText style={[styles.fieldLabel, { marginTop: 10 }]}>{ui("Nationality")}</AppText>
                        <TextInput
                          style={inputStyle('nationality')}
                          value={revalidationForm.nationality}
                          onChangeText={(text) => {
                            clearFieldErrors();
                            setRevalidationForm((prev) => ({ ...prev, nationality: text }));
                          }}
                          maxLength={80}
                          placeholder={ui("e.g. Nigeria")}
                          placeholderTextColor={colors.muted}
                        />
                        {fieldErrors.nationality ? <AppText style={styles.fieldError}>{fieldErrors.nationality}</AppText> : null}
                      </>
                    )}

                    {hasIdentityFields && (
                      <>
                        <AppText style={[styles.fieldLabel, { marginTop: 10 }]}>{ui("Date of Birth")}</AppText>
                        <TextInput
                          style={inputStyle('date_of_birth')}
                          value={revalidationForm.date_of_birth}
                          onChangeText={(text) => {
                            clearFieldErrors();
                            setRevalidationForm((prev) => ({ ...prev, date_of_birth: text }));
                          }}
                          placeholder={ui("YYYY-MM-DD")}
                          placeholderTextColor={colors.muted}
                        />
                        {fieldErrors.date_of_birth ? <AppText style={styles.fieldError}>{fieldErrors.date_of_birth}</AppText> : null}
                      </>
                    )}

                    {requestedFields.includes('live_photo') && (
                      <View style={styles.livePhotoBlock}>
                        <Icon name="camera-outline" size={20} color={colors.blue} />
                        <AppText style={styles.livePhotoText}>{ui("Capture a new live passport photo from your Profile page before submitting.")}</AppText>
                        <Button
                          title={ui("Open Profile for Photo")}
                          variant="outline"
                          onPress={() => navigation.navigate('Profile')}
                          icon="person-outline"
                          style={{ marginTop: 8 }}
                        />
                      </View>
                    )}

                    {revalidationError ? (
                      <AppText style={styles.errorText}>{revalidationError}</AppText>
                    ) : null}

                    <Button
                      title={submittingRevalidation ? ui("Submitting...") : 'Submit Credentials'}
                      onPress={handleSubmitRevalidation}
                      loading={submittingRevalidation}
                      style={{ marginTop: 16 }}
                    />
                  </View>
                )}
              </View>
            )}

            <View style={styles.privacyCard}>
              <Icon name="lock-closed-outline" size={20} color={colors.success} />
              <View style={styles.privacyBody}>
                <AppText style={styles.privacyTitle}>{ui("Your information is protected")}</AppText>
                <AppText style={styles.privacyText}>{ui("Verification documents are used only for account trust and safety checks.")}</AppText>
              </View>
            </View>

            {identityRejected ? (
              <Button
                onPress={() => navigation.navigate('AppealCreate', { appealType: 'verification' })}
                title={ui("Appeal this decision")}
                variant="outline"
                icon="megaphone-outline"
                style={{ marginBottom: 16 }}
              />
            ) : null}

            <Button
              onPress={() => navigation.navigate('Profile')}
              title={ui("Manage verification in profile")}
              variant="outline"
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.surface, flex: 1 },
  header: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 21,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  headerCopy: { alignItems: 'center', flex: 1 },
  headerSpacer: { width: 42 },
  eyebrow: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: typeScale.xs,
    lineHeight: 18,
    letterSpacing: 0.8,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: typeScale.lg,
    lineHeight: 28,
    marginTop: 2,
  },
  content: { padding: 18, paddingBottom: 30 },
  center: { alignItems: 'center', justifyContent: 'center', minHeight: 470 },
  loadingText: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 12,
  },
  hero: {
    backgroundColor: colors.navy,
    borderRadius: radius.lg,
    padding: 21,
  },
  heroComplete: { backgroundColor: '#073B35' },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,201,40,0.14)',
    borderRadius: 23,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  heroEyebrow: {
    color: '#9BC3F4',
    fontFamily: typography.bold,
    fontSize: typeScale.xs,
    lineHeight: 18,
    letterSpacing: 0.8,
    marginTop: 17,
  },
  heroTitle: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: typeScale.xl,
    lineHeight: 32,
    letterSpacing: -0.5,
    marginTop: 5,
  },
  heroText: {
    color: '#B7C8E2',
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 8,
  },
  progressTrack: {
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderRadius: 4,
    height: 6,
    marginTop: 18,
    overflow: 'hidden',
  },
  progressFill: { backgroundColor: colors.gold, borderRadius: 4, height: 6 },
  sectionEyebrow: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: typeScale.xs,
    lineHeight: 18,
    letterSpacing: 0.8,
    marginBottom: 9,
    marginTop: 26,
  },
  stepsCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  step: { flexDirection: 'row', paddingVertical: 17 },
  stepIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  stepIconComplete: { backgroundColor: colors.success },
  stepIconRejected: { backgroundColor: '#FFF0EF' },
  stepBody: { flex: 1, marginLeft: 12 },
  stepHeading: { alignItems: 'center', flexDirection: 'row' },
  stepTitle: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.semibold,
    fontSize: typeScale.sm,
    lineHeight: 20,
  },
  stepStatus: {
    color: colors.muted,
    fontFamily: typography.bold,
    fontSize: typeScale.xs,
    lineHeight: 18,
    textTransform: 'uppercase',
  },
  stepStatusComplete: { color: colors.success },
  stepStatusPending: { color: '#B46B00' },
  stepStatusRejected: { color: colors.danger },
  stepText: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 4,
  },
  documentText: {
    color: colors.text,
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 5,
    textTransform: 'capitalize',
  },
  stepAction: { alignItems: 'center', flexDirection: 'row', marginTop: 8 },
  stepActionText: {
    color: colors.blue,
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginRight: 5,
  },
  divider: { backgroundColor: colors.border, height: 1, marginLeft: 54 },
  revalidationCard: {
    backgroundColor: '#FFF8EC',
    borderColor: '#F5D895',
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: 18,
    padding: 16,
  },
  revalidationHeader: { alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 8 },
  revalidationTitle: {
    color: '#8A6700',
    fontFamily: typography.bold,
    fontSize: typeScale.reading,
    lineHeight: 22,
    flex: 1,
  },
  revalidationReason: {
    color: '#8A6700',
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  revalidationInstructions: {
    color: '#A67C00',
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    marginTop: 6,
    lineHeight: 18,
  },
  revalidationDue: {
    color: '#CC5500',
    fontFamily: typography.bold,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 8,
  },
  reviewNoteCard: {
    backgroundColor: '#FFF0EF',
    borderColor: '#F5C6C2',
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: 12,
    padding: 10,
  },
  reviewNoteTitle: {
    color: colors.danger,
    fontFamily: typography.bold,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  reviewNoteText: {
    color: colors.danger,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    marginTop: 4,
    lineHeight: 18,
  },
  submittedBanner: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    padding: 12,
  },
  submittedText: {
    color: colors.blue,
    flex: 1,
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  revalidationForm: { marginTop: 14 },
  fieldLabel: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginBottom: 5,
  },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: typography.regular,
    fontSize: typeScale.sm,
    lineHeight: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputError: {
    borderColor: colors.danger,
    borderWidth: 1.5,
  },
  fieldError: {
    color: colors.danger,
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 4,
  },
  errorText: {
    color: colors.danger,
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 12,
    textAlign: 'center',
  },
  livePhotoBlock: {
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceBlue,
    borderRadius: radius.md,
    marginTop: 12,
    padding: 12,
  },
  livePhotoText: {
    color: colors.blue,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 6,
  },
  privacyCard: {
    alignItems: 'flex-start',
    backgroundColor: '#F0FBF6',
    borderColor: '#CBEEDD',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 14,
    marginTop: 16,
    padding: 14,
  },
  privacyBody: { flex: 1, marginLeft: 10 },
  privacyTitle: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  privacyText: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 3,
  },
});

export default VerificationStatusScreen;
