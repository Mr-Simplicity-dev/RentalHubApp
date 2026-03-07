import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { launchCamera } from 'react-native-image-picker';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { AuthContext } from '../../context/AuthContext';
import { userService } from '../../services/userService';
import { authService } from '../../services/authService';
import { getErrorMessage, pickObject } from '../../utils/http';

const ProfileScreen = ({ navigation }) => {
  const { user, updateUser, logout } = useContext(AuthContext);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null);
  const [passportUri, setPassportUri] = useState('');
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
    const result = await launchCamera({
      mediaType: 'photo',
      cameraType: 'front',
      quality: 0.8,
      includeBase64: false,
    });
    if (result.didCancel) return;
    const uri = result?.assets?.[0]?.uri;
    if (uri) {
      setPassportUri(uri);
    }
  };

  const uploadPassport = async () => {
    if (!passportUri) {
      Toast.show({ type: 'error', text1: 'Capture passport photo first' });
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

      const response = await authService.uploadPassport(passportUri, captureToken);
      if (response?.user) {
        await updateUser(response.user);
      }
      setPassportUri('');
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

  const handleLogout = async () => {
    await logout();
  };

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

        {passportUri ? <Image source={{ uri: passportUri }} style={styles.preview} /> : null}
        <Button title="Capture Passport Photo" onPress={openCamera} variant="outline" style={styles.marginTop} />
        <Button title="Upload Passport" onPress={uploadPassport} loading={uploading} style={styles.marginTop} />
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
  preview: {
    marginTop: 8,
    width: 120,
    height: 120,
    borderRadius: 10,
    alignSelf: 'center',
  },
  marginTop: { marginTop: 8 },
});

export default ProfileScreen;
