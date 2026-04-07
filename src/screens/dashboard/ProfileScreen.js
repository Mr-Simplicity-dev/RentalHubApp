import React, { useContext, useEffect, useState } from 'react';
import { Platform, View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Switch } from 'react-native';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { AuthContext } from '../../context/AuthContext';
import { biometricService } from '../../services/biometricService';
import { userService } from '../../services/userService';
import { authService } from '../../services/authService';
import { storageService } from '../../services/storageService';
import { cameraService } from '../../services/cameraService';
import { getErrorMessage, getReviewStatus, pickObject } from '../../utils/http';

const ProfileScreen = ({ navigation }) => {
  const { user, updateUser, logout } = useContext(AuthContext);
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
  });

  useEffect(() => {
    setForm({
      full_name: user?.full_name || '',
      phone: user?.phone || '',
    });
  }, [user?.full_name, user?.phone]);

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
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>My Profile</Text>
      <Text style={styles.subtitle}>Account and verification details</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account Information</Text>
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
        <Text style={styles.infoRow}>Email: {user?.email || '-'}</Text>
        <Text style={styles.infoRow}>Role: {user?.user_type || '-'}</Text>
        <Button title="Save Changes" onPress={handleSaveProfile} loading={saving} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Identity Verification</Text>
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
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Security</Text>
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
          title="Notifications"
          variant="outline"
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
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  subtitle: { marginTop: 4, marginBottom: 14, textAlign: 'center', color: '#64748b' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  infoRow: { color: '#334155', marginBottom: 4 },
  statusText: { color: '#334155', marginBottom: 6 },
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
    marginTop: 8,
    width: 120,
    height: 120,
    borderRadius: 10,
    alignSelf: 'center',
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
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '600',
  },
  switchDescription: {
    marginTop: 4,
    color: '#64748b',
    lineHeight: 18,
  },
  helperText: {
    marginTop: 10,
    color: '#475569',
  },
});

export default ProfileScreen;
