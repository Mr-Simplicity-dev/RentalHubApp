import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import AssistedPasswordForm from '../../components/common/AssistedPasswordForm';
import React, { useContext, useEffect, useLayoutEffect, useState } from 'react';
import {Platform, View, StyleSheet, ScrollView, Image, TouchableOpacity, Switch} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { AuthContext } from '../../context/AuthContext';
import { useTour } from '../../context/TourContext';
import { biometricService } from '../../services/biometricService';
import { userService } from '../../services/userService';
import { authService } from '../../services/authService';
import { storageService } from '../../services/storageService';
import { cameraService } from '../../services/cameraService';
import { getErrorMessage, getReviewStatus, pickObject } from '../../utils/http';
import { colors, radius, shadows, typography, typeScale } from '../../theme';

import AppText from '../../components/common/AppText';
const ProfileScreen = ({ navigation }) => {
  const interfaceLanguage = useInterfaceLanguage();
  const { user, updateUser, logout } = useContext(AuthContext);
  const { replayTour } = useTour();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [biometricSaving, setBiometricSaving] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState({
    available: false,
    enabled: false,
    label: ui("Biometrics"),
  });
  const [status, setStatus] = useState(null);
  const [passportAsset, setPassportAsset] = useState(null);
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
  });

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation, interfaceLanguage]);

  const [twoFa, setTwoFa] = useState({ enabled: false, checked: false });
  const [twoFaPhase, setTwoFaPhase] = useState('idle');
  const [twoFaSecret, setTwoFaSecret] = useState('');
  const [twoFaCode, setTwoFaCode] = useState('');
  const [twoFaRecovery, setTwoFaRecovery] = useState([]);
  const [twoFaBusy, setTwoFaBusy] = useState(false);

  useEffect(() => {
    let active = true;
    authService
      .getTwoFactorStatus()
      .then((res) => {
        if (active) setTwoFa((prev) => ({ ...prev, enabled: res?.data?.totp_enabled === true, checked: true }));
      })
      .catch(() => {
        if (active) setTwoFa((prev) => ({ ...prev, checked: true }));
      });
    return () => {
      active = false;
    };
  }, []);

  const handleEnable2fa = async () => {
    setTwoFaBusy(true);
    try {
      const res = await authService.setupTotp();
      setTwoFaSecret(res?.data?.secret || '');
      setTwoFaCode('');
      setTwoFaPhase('confirm');
      Toast.show({ type: 'success', text1: ui("Add the secret to your authenticator app") });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: ui("Setup failed"),
        text2: getErrorMessage(err, 'Could not start two-factor setup'),
      });
    } finally {
      setTwoFaBusy(false);
    }
  };

  const handleConfirm2fa = async () => {
    if (!twoFaCode.trim()) {
      Toast.show({ type: 'info', text1: ui("Enter the 6-digit code from your authenticator app") });
      return;
    }
    setTwoFaBusy(true);
    try {
      const res = await authService.confirmTotp({ code: twoFaCode.trim() });
      setTwoFaRecovery(res?.data?.recovery_codes || []);
      setTwoFa((prev) => ({ ...prev, enabled: true }));
      setTwoFaPhase('recovery');
      Toast.show({ type: 'success', text1: ui("Two-factor enabled") });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: ui("Verification failed"),
        text2: getErrorMessage(err, 'Could not confirm your code'),
      });
    } finally {
      setTwoFaBusy(false);
    }
  };

  const handleDisable2fa = async () => {
    if (!twoFaCode.trim()) {
      Toast.show({ type: 'info', text1: ui("Enter your current 6-digit code") });
      return;
    }
    setTwoFaBusy(true);
    try {
      await authService.disableTotp({ code: twoFaCode.trim() });
      setTwoFa((prev) => ({ ...prev, enabled: false }));
      setTwoFaPhase('idle');
      setTwoFaSecret('');
      setTwoFaCode('');
      setTwoFaRecovery([]);
      Toast.show({ type: 'success', text1: ui("Two-factor disabled") });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: ui("Failed"),
        text2: getErrorMessage(err, 'Could not disable two-factor'),
      });
    } finally {
      setTwoFaBusy(false);
    }
  };

  useEffect(() => {
    setForm({
      full_name: user?.full_name || '',
      phone: user?.phone || '',
      bio: user?.bio || '',
    });
  }, [user?.full_name, user?.phone, user?.bio]);

  const loadVerificationStatus = async () => {
    try {
      const response = await userService.getVerificationStatus();
      setStatus(pickObject(response, ['data']));
    } catch (error) {
      // non-blocking
    }
  };

  useEffect(() => {
    loadVerificationStatus();
  }, []);

  const loadBiometricStatus = async () => {
    const nextStatus = await biometricService.getStatus();
    setBiometricStatus(nextStatus);
  };

  useEffect(() => {
    loadBiometricStatus();
    const unsubscribe = navigation.addListener('focus', loadBiometricStatus);

    return unsubscribe;
  }, [navigation]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const response = await userService.updateProfile({
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        bio: form.bio.trim(),
      });
      const nextUser = pickObject(response, ['data']);
      if (nextUser) {
        await updateUser(nextUser);
      }
      Toast.show({ type: 'success', text1: ui("Profile updated") });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Update failed"),
        text2: getErrorMessage(error, 'Could not update profile'),
      });
    } finally {
      setSaving(false);
    }
  };

  const openCamera = async () => {
    const result = await cameraService.pickPassportPhoto();

    if (result.cancelled) {
      if (result.message) {
        Toast.show({
          type: 'info',
          text1: Platform.OS === "web" ? ui("Select a passport photo") : ui("Camera unavailable"),
          text2: result.message,
        });
      }
      return;
    }

    if (result.asset?.uri) {
      setPassportAsset(result.asset);
    }
  };

  const uploadPassport = async () => {
    if (!passportAsset?.uri) {
      Toast.show({
        type: 'error',
        text1: Platform.OS === "web" ? ui("Select passport photo first") : ui("Capture passport photo first"),
      });
      return;
    }
    setUploading(true);
    try {
      let captureToken = '';
      try {
        const session = await userService.createLiveCaptureSession();
        captureToken = session?.data?.token || '';
      } catch (error) {
        // session might be optional
      }

      const response = await authService.uploadPassport(passportAsset, captureToken);
      if (response?.user) {
        await updateUser(response.user);
      }
      setPassportAsset(null);
      await loadVerificationStatus();
      Toast.show({ type: 'success', text1: ui("Passport uploaded") });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Upload failed"),
        text2: getErrorMessage(error, 'Could not upload passport'),
      });
    } finally {
      setUploading(false);
    }
  };

  const handleBiometricToggle = async (enabled) => {
    if (biometricSaving) {
      return;
    }

    setBiometricSaving(true);

    try {
      if (!enabled) {
        await biometricService.clearStoredSession();
        setBiometricStatus((previous) => ({ ...previous, enabled: false }));
        Toast.show({
          type: 'success',
          text1: ui("Biometric login disabled"),
        });
        return;
      }

      const token = await storageService.getToken();
      const sessionToken = await storageService.getSessionToken();
      const currentUser = user || (await storageService.getUser());

      if (!token || !currentUser) {
        Toast.show({
          type: 'error',
          text1: ui("Biometric Login"),
          text2: ui("Sign in again before enabling biometric login."),
        });
        return;
      }

      const response = await biometricService.enableForSession({
        token,
        session_token: sessionToken,
        user: currentUser,
      });

      if (!response.success) {
        Toast.show({
          type: 'error',
          text1: ui("Biometric Login"),
          text2: response.message || ui("Could not enable biometric login."),
        });
        return;
      }

      await loadBiometricStatus();
      Toast.show({
        type: 'success',
        text1: ui("{value0} login enabled", {value0: (response.label || ui("Biometric"))}),
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Biometric Login"),
        text2: ui("Could not update biometric login right now."),
      });
    } finally {
      setBiometricSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const reviewStatus = getReviewStatus(user, status);
  const reviewStatusLabel =
    reviewStatus === 'verified'
      ? 'Verified'
      : reviewStatus === 'pending'
        ? 'Pending review'
        : reviewStatus === 'rejected'
          ? 'Rejected'
          : 'Not submitted';

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
          <AppText style={styles.headerEyebrow}>{ui("ACCOUNT")}</AppText>
          <AppText style={styles.headerTitle}>{ui("Profile")}</AppText>
        </View>
        <TouchableOpacity
          accessibilityLabel={ui("Open notifications")}
          onPress={() => navigation.navigate('Notifications')}
          style={styles.backButton}>
          <Icon name="notifications-outline" size={21} color={colors.navy} />
        </TouchableOpacity>
      </View>

    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      <View style={styles.profileHero}>
        <View style={styles.avatar}>
          <AppText style={styles.avatarText}>
            {String(user?.full_name || 'U').trim().charAt(0).toUpperCase()}
          </AppText>
          {reviewStatus === "verified" ? (
            <View style={styles.verifiedDot}>
              <Icon name="checkmark" size={11} color={colors.white} />
            </View>
          ) : null}
        </View>
        <AppText style={styles.title}>{user?.full_name || ui('RentalHub member')}</AppText>
        <AppText style={styles.subtitle}>{user?.email || ui('No email available')}</AppText>
        <View style={styles.rolePill}>
          <AppText style={styles.roleText}>
            {String(user?.user_type || 'member').replace(/_/g, ' ')}
          </AppText>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <Icon name="person-outline" size={19} color={colors.blue} />
          </View>
          <AppText style={styles.cardTitle}>{ui("Personal information")}</AppText>
        </View>
        <Input
          label={ui("Full Name")}
          value={form.full_name}
          onChangeText={(value) => setForm((prev) => ({ ...prev, full_name: value }))}
        />
        <Input
          label={ui("Phone")}
          value={form.phone}
          onChangeText={(value) => setForm((prev) => ({ ...prev, phone: value }))}
          keyboardType="phone-pad"
        />
        <Input
          label={ui("Bio")}
          value={form.bio}
          onChangeText={(value) => setForm((prev) => ({ ...prev, bio: value }))}
          multiline
          numberOfLines={3}
          placeholder={ui("Tell us about yourself...")}
        />
        <Button title={ui("Save changes")} onPress={handleSaveProfile} loading={saving} />
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <Icon name="shield-checkmark-outline" size={19} color={colors.blue} />
          </View>
          <View style={styles.cardHeaderCopy}>
            <AppText style={styles.cardTitle}>{ui("Identity verification")}</AppText>
            <AppText style={styles.cardCaption}>{ui("Status: ")}{reviewStatusLabel}</AppText>
          </View>
        </View>
        <AppText style={styles.statusText}>{ui("Email:")}{status?.email_required===false ? ui('Not required') : status?.email ? ui("Verified") : ui("Pending")}{ui(" | Phone: ")}{status?.phone ? ui("Verified") : ui("Pending")}
        </AppText>
        <AppText style={styles.statusText}>{ui("Identity:")}{status?.identity ? ui("Verified") : ui("Pending")}{ui(" | Document: ")}{status?.identity_document_type || '-'}
        </AppText>
        <AppText style={styles.statusText}>{ui("Review Status: ")}{reviewStatusLabel}</AppText>

        {reviewStatus === "rejected" ? (
          <View style={styles.warningBox}>
            <AppText style={styles.warningText}>{ui("Your verification was rejected. Capture a new live passport photo and upload it again.")}</AppText>
          </View>
        ) : reviewStatus === "pending" ? (
          <View style={styles.infoBox}>
            <AppText style={styles.infoText}>{ui("Your passport has been submitted and is waiting for review.")}</AppText>
          </View>
        ) : null}

        {passportAsset?.uri ? <Image source={{ uri: passportAsset.uri }} style={styles.preview} /> : null}
        <Button
          title={Platform.OS === "web" ? 'Select Passport Photo' : 'Capture Passport Photo'}
          onPress={openCamera}
          variant="outline"
          style={styles.marginTop}
        />
        <Button title={ui("Upload Passport")} onPress={uploadPassport} loading={uploading} style={styles.marginTop} />
        <Button
          title={ui("View Verification Status")}
          variant="outline"
          onPress={() => navigation.navigate('VerificationStatus')}
          style={styles.marginTop}
        />
        {!status?.phone ? (
          <Button
            title={ui("Verify Phone")}
            variant="outline"
            onPress={() => navigation.navigate('VerifyPhone')}
            style={styles.marginTop}
          />
        ) : null}
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <Icon name="finger-print-outline" size={20} color={colors.blue} />
          </View>
          <AppText style={styles.cardTitle}>{ui("Security")}</AppText>
        </View>
        {biometricStatus.available ? (
          <>
            <View style={styles.switchRow}>
              <View style={styles.switchTextWrap}>
                <AppText style={styles.switchTitle}>{ui("Use ")}{biometricStatus.label}{ui(" to unlock the app")}</AppText>
                <AppText style={styles.switchDescription}>{ui("When enabled, we will ask for your biometric before restoring your saved session.")}</AppText>
              </View>
              <Switch
                value={biometricStatus.enabled}
                onValueChange={handleBiometricToggle}
                disabled={biometricSaving}
                trackColor={{ false: '#cbd5e1', true: '#7dd3fc' }}
                thumbColor={biometricStatus.enabled ? '#0284c7' : '#f8fafc'}
              />
            </View>
            <AppText style={styles.helperText}>{ui("Status:")}{biometricStatus.enabled ? ui("{value0} enabled", {value0: (biometricStatus.label)}) : ui('Disabled')}
            </AppText>
          </>
        ) : (
          <AppText style={styles.helperText}>{ui("Biometric login is not available on this device.")}</AppText>
        )}

        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, marginTop: 16, paddingTop: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText style={{ color: colors.ink, fontFamily: typography.semibold, fontSize: typeScale.sm, lineHeight: 20 }}>{ui("Two-factor authentication")}</AppText>
            <AppText style={{ color: twoFa.enabled ? colors.success : colors.muted, fontFamily: typography.semibold, fontSize: typeScale.xs, lineHeight: 18 }}>
              {twoFa.enabled ? ui("Enabled") : twoFa.checked ? ui("Off") : ui('Checking…')}
            </AppText>
          </View>

          {!twoFa.enabled && twoFa.checked && twoFaPhase === 'idle' ? (
            <Button
              title={ui("Enable two-factor auth")}
              variant="outline"
              style={{ marginTop: 10 }}
              onPress={handleEnable2fa}
              loading={twoFaBusy}
            />
          ) : null}

          {twoFaPhase === "confirm" ? (
            <>
              <AppText style={styles.helperText}>{ui("Add this secret to your authenticator app (Google Authenticator, Authy, etc.):")}</AppText>
              <AppText selectable style={{ color: colors.ink, fontFamily: typography.medium, fontSize: typeScale.xs, lineHeight: 18, marginVertical: 6 }}>
                {twoFaSecret}
              </AppText>
              <Input
                label={ui("6-digit code")}
                value={twoFaCode}
                onChangeText={setTwoFaCode}
                placeholder="123456"
                keyboardType="number-pad"
                maxLength={6}
              />
              <Button title={ui("Confirm and enable")} onPress={handleConfirm2fa} loading={twoFaBusy} style={{ marginTop: 8 }} />
              <Button
                title={ui("Cancel setup")}
                variant="outline"
                style={{ marginTop: 8 }}
                onPress={() => {
                  setTwoFaPhase('idle');
                  setTwoFaSecret('');
                  setTwoFaCode('');
                }}
              />
            </>
          ) : null}

          {twoFaPhase === 'recovery' ? (
            <>
              <AppText style={styles.helperText}>{ui("Save these recovery codes somewhere safe — you can use one if you lose your authenticator app.")}</AppText>
              <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: 10, marginVertical: 8 }}>
                {twoFaRecovery.map((code) => (
                  <AppText key={code} style={{ color: colors.ink, fontFamily: typography.medium, fontSize: typeScale.xs, lineHeight: 18, marginVertical: 2 }}>
                    {code}
                  </AppText>
                ))}
              </View>
              <Button
                title={ui("Done")}
                onPress={() => {
                  setTwoFaPhase('idle');
                  setTwoFaSecret('');
                  setTwoFaCode('');
                  setTwoFaRecovery([]);
                }}
              />
            </>
          ) : null}

          {twoFa.enabled && twoFaPhase !== 'disable' ? (
            <Button
              title={ui("Disable two-factor auth")}
              variant="outline"
              style={{ marginTop: 10 }}
              onPress={() => {
                setTwoFaPhase('disable');
                setTwoFaCode('');
              }}
            />
          ) : null}

          {twoFaPhase === 'disable' ? (
            <>
              <Input
                label={ui("Current 6-digit code")}
                value={twoFaCode}
                onChangeText={setTwoFaCode}
                placeholder="123456"
                keyboardType="number-pad"
                maxLength={6}
                containerStyle={{ marginTop: 10 }}
              />
              <Button title={ui("Confirm disable")} onPress={handleDisable2fa} loading={twoFaBusy} style={{ marginTop: 8 }} />
              <Button
                title={ui("Cancel")}
                variant="outline"
                style={{ marginTop: 8 }}
                onPress={() => setTwoFaPhase('idle')}
              />
            </>
          ) : null}
        </View>
      </View>

      <View style={styles.card}>
        <Button
          title={ui("App Settings")}
          variant="outline"
          onPress={() => navigation.navigate('Settings')}
        />
        <Button
          title={ui("Replay App Tour")}
          variant="outline"
          style={styles.marginTop}
          onPress={replayTour}
        />
        <Button
          title={ui("Notifications")}
          variant="outline"
          style={styles.marginTop}
          onPress={() => navigation.navigate('Notifications')}
        />
        {['tenant', 'user', 'landlord', 'agent', 'lawyer', 'state_lawyer', 'zonal_lawyer', 'super_lawyer'].includes(user?.user_type) ? (
          <Button
            title={ui("My Appeals")}
            variant="outline"
            style={styles.marginTop}
            onPress={() => navigation.navigate('MyAppeals')}
          />
        ) : null}
        {/* Super-admin tools now live on the Super Admin dashboard, grouped by job.
            Only the roles that cannot see that dashboard keep their shortcuts here. */}
        {user?.user_type === 'super_financial_admin' ? (
          <Button
            title={ui("State Admin Management")}
            variant="outline"
            style={styles.marginTop}
            onPress={() => navigation.navigate('FinanceStateAdmins')}
          />
        ) : null}
        {user?.user_type === "admin" ? (
          <Button
            title={ui("Agent Commissions")}
            variant="outline"
            style={styles.marginTop}
            onPress={() => navigation.navigate('AgentCommissionAdmin')}
          />
        ) : null}
        {['lawyer', 'state_lawyer', 'zonal_lawyer', 'super_lawyer'].includes(user?.user_type) ? (
          <Button
            title={ui("Court Bundle")}
            variant="outline"
            style={styles.marginTop}
            onPress={() => navigation.navigate('CourtBundle')}
          />
        ) : null}
        <Button
          title={ui("My Personal Data (NDPR)")}
          variant="outline"
          style={styles.marginTop}
          onPress={() => navigation.navigate('PrivacyData')}
        />
        {['state_admin', 'state_financial_admin'].includes(user?.user_type) ? (
          <Button
            title={ui("Commissions & Withdrawals")}
            variant="outline"
            style={styles.marginTop}
            onPress={() => navigation.navigate('StateAdminFinance')}
          />
        ) : null}
        <Button
          title={ui("Logout")}
          variant="danger"
          onPress={handleLogout}
          style={styles.marginTop}
        />
      </View>
    <AssistedPasswordForm />
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  screen: { flex: 1, backgroundColor: colors.surface },
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
  headerEyebrow: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: typeScale.xs,
    lineHeight: 18,
    letterSpacing: 0.8,
  },
  headerTitle: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: typeScale.lg,
    lineHeight: 28,
    marginTop: 2,
  },
  content: { padding: 18, paddingBottom: 30 },
  profileHero: {
    alignItems: 'center',
    paddingBottom: 24,
    paddingTop: 9,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderRadius: 42,
    height: 84,
    justifyContent: 'center',
    position: 'relative',
    width: 84,
  },
  avatarText: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 32,
  },
  verifiedDot: {
    alignItems: 'center',
    backgroundColor: colors.success,
    borderColor: colors.surface,
    borderRadius: 10,
    borderWidth: 3,
    bottom: 1,
    height: 21,
    justifyContent: 'center',
    position: 'absolute',
    right: 1,
    width: 21,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: typeScale.xl,
    lineHeight: 32,
    letterSpacing: -0.5,
    marginTop: 14,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.reading,
    lineHeight: 22,
    marginTop: 4,
    textAlign: 'center',
  },
  rolePill: {
    backgroundColor: colors.surfaceBlue,
    borderRadius: radius.pill,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  roleText: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: typeScale.xs,
    lineHeight: 18,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 17,
    marginBottom: 14,
    ...shadows.soft,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 15,
  },
  cardIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    marginRight: 10,
    width: 36,
  },
  cardHeaderCopy: { flex: 1 },
  cardTitle: { fontSize: typeScale.base, lineHeight: 24, fontFamily: typography.bold, color: colors.ink },
  cardCaption: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 2,
  },
  statusText: { color: colors.text, fontFamily: typography.regular, marginBottom: 7 },
  infoBox: {
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    padding: 10,
  },
  infoText: {
    color: '#1d4ed8',
  },
  warningBox: {
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 10,
  },
  warningText: {
    color: '#b91c1c',
  },
  preview: {
    alignSelf: 'center',
    borderRadius: radius.md,
    height: 150,
    marginTop: 8,
    width: 150,
  },
  marginTop: { marginTop: 8 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  switchTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  switchTitle: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: typeScale.base,
    lineHeight: 24,
  },
  switchDescription: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.reading,
    lineHeight: 22,
    marginTop: 4,
  },
  helperText: {
    color: colors.text,
    fontFamily: typography.regular,
    marginTop: 10,
  },
});

export default ProfileScreen;
