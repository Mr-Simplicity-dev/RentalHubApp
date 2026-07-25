import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import Button from '../../components/common/Button';
import { userService } from '../../services/userService';
import { colors, radius, typography } from '../../theme';
import { getErrorMessage, pickObject } from '../../utils/http';

const VerificationStatusScreen = ({ navigation }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadStatus = useCallback(async ({ refresh = false } = {}) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const response = await userService.getVerificationStatus();
      setStatus(pickObject(response, ['data']) || response?.data || {});
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Could not load verification',
        text2: getErrorMessage(error, 'Please try again.'),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const emailVerified = Boolean(status?.email || status?.email_verified);
  const phoneVerified = Boolean(status?.phone || status?.phone_verified);
  const identityVerified = Boolean(status?.identity || status?.identity_verified);
  const reviewStatus =
    status?.review_status || status?.identity_verification_status || 'not_submitted';
  const identityPending = !identityVerified && reviewStatus === 'pending';
  const identityRejected = !identityVerified && reviewStatus === 'rejected';
  const completedCount = [emailVerified, phoneVerified, identityVerified].filter(Boolean).length;
  const progress = useMemo(() => `${Math.round((completedCount / 3) * 100)}%`, [completedCount]);

  const steps = [
    {
      key: 'email',
      icon: 'mail-outline',
      title: 'Email address',
      description: emailVerified ? 'Your email address is confirmed.' : 'Confirm your email address.',
      complete: emailVerified,
    },
    {
      key: 'phone',
      icon: 'call-outline',
      title: 'Phone number',
      description: phoneVerified ? 'Your phone number is confirmed.' : 'Verify your mobile number with an OTP.',
      complete: phoneVerified,
      action: !phoneVerified ? () => navigation.navigate('VerifyPhone') : null,
      actionLabel: 'Verify phone',
    },
    {
      key: 'identity',
      icon: 'person-outline',
      title: 'Identity document',
      description: identityVerified
        ? 'Your identity has been verified.'
        : identityPending
          ? 'Your passport photo is waiting for review.'
          : identityRejected
            ? 'Your submission needs to be replaced.'
            : 'Submit a live passport photo for review.',
      complete: identityVerified,
      pending: identityPending,
      rejected: identityRejected,
      action: !identityVerified ? () => navigation.navigate('Profile') : null,
      actionLabel: identityRejected ? 'Replace photo' : identityPending ? 'View profile' : 'Start verification',
    },
  ];

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="arrow-back" size={22} color={colors.navy} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>TRUST AND SAFETY</Text>
          <Text style={styles.title}>Verification</Text>
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
            <Text style={styles.loadingText}>Checking verification…</Text>
          </View>
        ) : (
          <>
            <View style={[styles.hero, completedCount === 3 && styles.heroComplete]}>
              <View style={styles.heroIcon}>
                <Icon
                  name={completedCount === 3 ? 'shield-checkmark' : 'shield-outline'}
                  size={27}
                  color={colors.gold}
                />
              </View>
              <Text style={styles.heroEyebrow}>
                {completedCount === 3 ? 'FULLY VERIFIED' : 'ACCOUNT PROGRESS'}
              </Text>
              <Text style={styles.heroTitle}>
                {completedCount === 3 ? 'Your identity is verified' : `${completedCount} of 3 steps complete`}
              </Text>
              <Text style={styles.heroText}>
                {completedCount === 3
                  ? 'Your verified profile helps create a safer RentalHub community.'
                  : 'Complete verification to unlock the full RentalHub workflow.'}
              </Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: progress }]} />
              </View>
            </View>

            <Text style={styles.sectionEyebrow}>VERIFICATION STEPS</Text>
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
                        <Text style={styles.stepTitle}>{step.title}</Text>
                        <Text
                          style={[
                            styles.stepStatus,
                            step.complete && styles.stepStatusComplete,
                            step.pending && styles.stepStatusPending,
                            step.rejected && styles.stepStatusRejected,
                          ]}>
                          {step.complete ? 'Verified' : step.pending ? 'In review' : step.rejected ? 'Action needed' : 'Incomplete'}
                        </Text>
                      </View>
                      <Text style={styles.stepText}>{step.description}</Text>
                      {step.key === 'identity' && status?.identity_document_type ? (
                        <Text style={styles.documentText}>
                          Document: {String(status.identity_document_type).replace(/_/g, ' ')}
                        </Text>
                      ) : null}
                      {step.action ? (
                        <TouchableOpacity onPress={step.action} style={styles.stepAction}>
                          <Text style={styles.stepActionText}>{step.actionLabel}</Text>
                          <Icon name="arrow-forward" size={15} color={colors.blue} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                  {index < steps.length - 1 ? <View style={styles.divider} /> : null}
                </View>
              ))}
            </View>

            <View style={styles.privacyCard}>
              <Icon name="lock-closed-outline" size={20} color={colors.success} />
              <View style={styles.privacyBody}>
                <Text style={styles.privacyTitle}>Your information is protected</Text>
                <Text style={styles.privacyText}>
                  Verification documents are used only for account trust and safety checks.
                </Text>
              </View>
            </View>

            <Button
              onPress={() => navigation.navigate('Profile')}
              title="Manage verification in profile"
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
    fontSize: 13,
    letterSpacing: 1.2,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 20,
    marginTop: 2,
  },
  content: { padding: 18, paddingBottom: 30 },
  center: { alignItems: 'center', justifyContent: 'center', minHeight: 470 },
  loadingText: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
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
    fontSize: 13,
    letterSpacing: 1.2,
    marginTop: 17,
  },
  heroTitle: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 23,
    letterSpacing: -0.5,
    marginTop: 5,
  },
  heroText: {
    color: '#B7C8E2',
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 20,
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
    fontSize: 13,
    letterSpacing: 1.2,
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
    fontSize: 14,
  },
  stepStatus: {
    color: colors.muted,
    fontFamily: typography.bold,
    fontSize: 13,
    textTransform: 'uppercase',
  },
  stepStatusComplete: { color: colors.success },
  stepStatusPending: { color: '#B46B00' },
  stepStatusRejected: { color: colors.danger },
  stepText: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 17,
    marginTop: 4,
  },
  documentText: {
    color: colors.text,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 5,
    textTransform: 'capitalize',
  },
  stepAction: { alignItems: 'center', flexDirection: 'row', marginTop: 8 },
  stepActionText: {
    color: colors.blue,
    fontFamily: typography.semibold,
    fontSize: 13,
    marginRight: 5,
  },
  divider: { backgroundColor: colors.border, height: 1, marginLeft: 54 },
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
    fontSize: 13,
  },
  privacyText: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 15,
    marginTop: 3,
  },
});

export default VerificationStatusScreen;
