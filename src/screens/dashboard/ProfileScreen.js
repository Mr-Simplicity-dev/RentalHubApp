import React, { useContext, useEffect, useLayoutEffect, useState } from 'react';
import { Platform, View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Switch } from 'react-native';
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
import { colors, radius, shadows, typography } from '../../theme';

const ProfileScreen = ({ navigation }) => {
  const { user, updateUser, logout } = useContext(AuthContext);
  const { replayTour } = useTour();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [biometricSaving, setBiometricSaving] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState({
    available: false,
    enabled: false,
    label: 'Biometrics',
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
  }, [navigation]);

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
      Toast.show({ type: 'success', text1: 'Profile updated' });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Update failed',
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
          text1: Platform.OS === 'web' ? 'Select a passport photo' : 'Camera unavailable',
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
        text1: Platform.OS === 'web' ? 'Select passport photo first' : 'Capture passport photo first',
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
      Toast.show({ type: 'success', text1: 'Passport uploaded' });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Upload failed',
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
          text1: 'Biometric login disabled',
        });
        return;
      }

      const token = await storageService.getToken();
      const currentUser = user || (await storageService.getUser());

      if (!token || !currentUser) {
        Toast.show({
          type: 'error',
          text1: 'Biometric Login',
          text2: 'Sign in again before enabling biometric login.',
        });
        return;
      }

      const response = await biometricService.enableForSession({
        token,
        user: currentUser,
      });

      if (!response.success) {
        Toast.show({
          type: 'error',
          text1: 'Biometric Login',
          text2: response.message || 'Could not enable biometric login.',
        });
        return;
      }

      await loadBiometricStatus();
      Toast.show({
        type: 'success',
        text1: `${response.label || 'Biometric'} login enabled`,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Biometric Login',
        text2: 'Could not update biometric login right now.',
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
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="arrow-back" size={22} color={colors.navy} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerEyebrow}>ACCOUNT</Text>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <TouchableOpacity
          accessibilityLabel="Open notifications"
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
          <Text style={styles.avatarText}>
            {String(user?.full_name || 'U').trim().charAt(0).toUpperCase()}
          </Text>
          {reviewStatus === 'verified' ? (
            <View style={styles.verifiedDot}>
              <Icon name="checkmark" size={11} color={colors.white} />
            </View>
          ) : null}
        </View>
        <Text style={styles.title}>{user?.full_name || 'RentalHub member'}</Text>
        <Text style={styles.subtitle}>{user?.email || 'No email available'}</Text>
        <View style={styles.rolePill}>
          <Text style={styles.roleText}>
            {String(user?.user_type || 'member').replace(/_/g, ' ')}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <Icon name="person-outline" size={19} color={colors.blue} />
          </View>
          <Text style={styles.cardTitle}>Personal information</Text>
        </View>
        <Input
          label="Full Name"
          value={form.full_name}
          onChangeText={(value) => setForm((prev) => ({ ...prev, full_name: value }))}
        />
        <Input
          label="Phone"
          value={form.phone}
          onChangeText={(value) => setForm((prev) => ({ ...prev, phone: value }))}
          keyboardType="phone-pad"
        />
        <Input
          label="Bio"
          value={form.bio}
          onChangeText={(value) => setForm((prev) => ({ ...prev, bio: value }))}
          multiline
          numberOfLines={3}
          placeholder="Tell us about yourself..."
        />
        <Button title="Save changes" onPress={handleSaveProfile} loading={saving} />
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <Icon name="shield-checkmark-outline" size={19} color={colors.blue} />
          </View>
          <View style={styles.cardHeaderCopy}>
            <Text style={styles.cardTitle}>Identity verification</Text>
            <Text style={styles.cardCaption}>Status: {reviewStatusLabel}</Text>
          </View>
        </View>
        <Text style={styles.statusText}>
          Email: {status?.email ? 'Verified' : 'Pending'} | Phone: {status?.phone ? 'Verified' : 'Pending'}
        </Text>
        <Text style={styles.statusText}>
          Identity: {status?.identity ? 'Verified' : 'Pending'} | Document: {status?.identity_document_type || '-'}
        </Text>
        <Text style={styles.statusText}>Review Status: {reviewStatusLabel}</Text>

        {reviewStatus === 'rejected' ? (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              Your verification was rejected. Capture a new live passport photo and upload it again.
            </Text>
          </View>
        ) : reviewStatus === 'pending' ? (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Your passport has been submitted and is waiting for review.
            </Text>
          </View>
        ) : null}

        {passportAsset?.uri ? <Image source={{ uri: passportAsset.uri }} style={styles.preview} /> : null}
        <Button
          title={Platform.OS === 'web' ? 'Select Passport Photo' : 'Capture Passport Photo'}
          onPress={openCamera}
          variant="outline"
          style={styles.marginTop}
        />
        <Button title="Upload Passport" onPress={uploadPassport} loading={uploading} style={styles.marginTop} />
        <Button
          title="View Verification Status"
          variant="outline"
          onPress={() => navigation.navigate('VerificationStatus')}
          style={styles.marginTop}
        />
        {!status?.phone ? (
          <Button
            title="Verify Phone"
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
          <Text style={styles.cardTitle}>Security</Text>
        </View>
        {biometricStatus.available ? (
          <>
            <View style={styles.switchRow}>
              <View style={styles.switchTextWrap}>
                <Text style={styles.switchTitle}>Use {biometricStatus.label} to unlock the app</Text>
                <Text style={styles.switchDescription}>
                  When enabled, we will ask for your biometric before restoring your saved session.
                </Text>
              </View>
              <Switch
                value={biometricStatus.enabled}
                onValueChange={handleBiometricToggle}
                disabled={biometricSaving}
                trackColor={{ false: '#cbd5e1', true: '#7dd3fc' }}
                thumbColor={biometricStatus.enabled ? '#0284c7' : '#f8fafc'}
              />
            </View>
            <Text style={styles.helperText}>
              Status: {biometricStatus.enabled ? `${biometricStatus.label} enabled` : 'Disabled'}
            </Text>
          </>
        ) : (
          <Text style={styles.helperText}>
            Biometric login is not available on this device.
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Button
          title="App Settings"
          variant="outline"
          onPress={() => navigation.navigate('Settings')}
        />
        <Button
          title="Replay App Tour"
          variant="outline"
          style={styles.marginTop}
          onPress={replayTour}
        />
        <Button
          title="Notifications"
          variant="outline"
          style={styles.marginTop}
          onPress={() => navigation.navigate('Notifications')}
        />
        <Button
          title="Logout"
          variant="danger"
          onPress={handleLogout}
          style={styles.marginTop}
        />
      </View>
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
    fontSize: 9,
    letterSpacing: 1.2,
  },
  headerTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 20,
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
    fontSize: 31,
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
    fontFamily: typography.bold,
    fontSize: 23,
    letterSpacing: -0.5,
    marginTop: 14,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
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
    fontSize: 9,
    letterSpacing: 0.7,
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
  cardTitle: { fontSize: 16, fontFamily: typography.bold, color: colors.ink },
  cardCaption: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 10,
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
    fontSize: 15,
  },
  switchDescription: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  helperText: {
    color: colors.text,
    fontFamily: typography.regular,
    marginTop: 10,
  },
});

export default ProfileScreen;
