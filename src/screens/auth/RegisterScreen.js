import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { AuthContext } from '../../context/AuthContext';

const RegisterScreen = ({ navigation }) => {
  const { register } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState('tenant');
  const [isForeigner, setIsForeigner] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    lawyer_email: '',
    nin: '',
    international_passport_number: '',
    nationality: '',
    password: '',
    confirm_password: '',
  });

  const onChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleRegister = async () => {
    const required = [form.full_name, form.email, form.phone, form.lawyer_email, form.password];
    if (required.some((entry) => !entry?.trim())) {
      Toast.show({
        type: 'error',
        text1: 'Missing fields',
        text2: 'Full name, email, phone, lawyer email, and password are required.',
      });
      return;
    }

    if (form.password !== form.confirm_password) {
      Toast.show({
        type: 'error',
        text1: 'Password mismatch',
      });
      return;
    }

    if (form.password.length < 8) {
      Toast.show({
        type: 'error',
        text1: 'Weak password',
        text2: 'Password must be at least 8 characters.',
      });
      return;
    }

    if (!isForeigner && !/^\d{11}$/.test(form.nin)) {
      Toast.show({
        type: 'error',
        text1: 'NIN required',
        text2: 'Local users must provide exactly 11 digits NIN.',
      });
      return;
    }

    if (isForeigner && !form.international_passport_number.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Passport required',
        text2: 'Foreigner registrations must provide passport number.',
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        lawyer_email: form.lawyer_email.trim().toLowerCase(),
        password: form.password,
        user_type: userType,
        is_foreigner: isForeigner,
        identity_document_type: isForeigner ? 'passport' : 'nin',
      };

      if (isForeigner) {
        payload.international_passport_number = form.international_passport_number.trim();
        payload.nationality = form.nationality.trim();
      } else {
        payload.nin = form.nin.trim();
      }

      const response = await register(payload);
      if (response.success) {
        Toast.show({
          type: 'success',
          text1: 'Registration complete',
          text2: 'Your account has been created.',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Registration failed',
          text2: response.message || 'Please try again.',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Registration failed',
        text2: error?.response?.data?.message || 'Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Tenant and landlord onboarding</Text>

        <View style={styles.toggleRow}>
          {['tenant', 'landlord'].map((role) => (
            <TouchableOpacity
              key={role}
              onPress={() => setUserType(role)}
              style={[styles.toggleBtn, userType === role && styles.toggleBtnActive]}
            >
              <Text style={[styles.toggleText, userType === role && styles.toggleTextActive]}>
                {role === 'tenant' ? 'Tenant' : 'Landlord'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.toggleRow}>
          {[false, true].map((value) => (
            <TouchableOpacity
              key={String(value)}
              onPress={() => setIsForeigner(value)}
              style={[styles.toggleBtn, isForeigner === value && styles.toggleBtnActive]}
            >
              <Text style={[styles.toggleText, isForeigner === value && styles.toggleTextActive]}>
                {value ? 'Foreigner' : 'Nigerian'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input
          label="Full Name"
          value={form.full_name}
          onChangeText={(value) => onChange('full_name', value)}
          placeholder="John Doe"
          icon="person-outline"
        />
        <Input
          label="Email"
          value={form.email}
          onChangeText={(value) => onChange('email', value)}
          placeholder="john@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          icon="mail-outline"
        />
        <Input
          label="Phone"
          value={form.phone}
          onChangeText={(value) => onChange('phone', value)}
          placeholder="+2348012345678"
          keyboardType="phone-pad"
          icon="call-outline"
        />
        <Input
          label="Lawyer Email"
          value={form.lawyer_email}
          onChangeText={(value) => onChange('lawyer_email', value)}
          placeholder="lawyer@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          icon="briefcase-outline"
        />

        {!isForeigner ? (
          <Input
            label="NIN"
            value={form.nin}
            onChangeText={(value) => onChange('nin', value)}
            placeholder="11-digit NIN"
            keyboardType="number-pad"
            icon="card-outline"
            maxLength={11}
          />
        ) : (
          <>
            <Input
              label="International Passport Number"
              value={form.international_passport_number}
              onChangeText={(value) => onChange('international_passport_number', value)}
              placeholder="Passport number"
              autoCapitalize="characters"
              icon="document-outline"
            />
            <Input
              label="Nationality"
              value={form.nationality}
              onChangeText={(value) => onChange('nationality', value)}
              placeholder="Country"
              icon="globe-outline"
            />
          </>
        )}

        <Input
          label="Password"
          value={form.password}
          onChangeText={(value) => onChange('password', value)}
          placeholder="Minimum 8 characters"
          secureTextEntry
          icon="lock-closed-outline"
        />
        <Input
          label="Confirm Password"
          value={form.confirm_password}
          onChangeText={(value) => onChange('confirm_password', value)}
          placeholder="Repeat password"
          secureTextEntry
          icon="lock-closed-outline"
        />

        <Button title="Create Account" onPress={handleRegister} loading={loading} style={styles.cta} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}> Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { padding: 20, paddingBottom: 36 },
  title: { fontSize: 30, fontWeight: '800', color: '#0f172a' },
  subtitle: { marginTop: 6, marginBottom: 16, color: '#64748b' },
  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  toggleBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 10,
    alignItems: 'center',
  },
  toggleBtnActive: {
    borderColor: '#0284c7',
    backgroundColor: '#eff6ff',
  },
  toggleText: { fontWeight: '600', color: '#475569' },
  toggleTextActive: { color: '#0284c7' },
  cta: { marginTop: 6 },
  footer: {
    marginTop: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: { color: '#64748b' },
  footerLink: { color: '#0284c7', fontWeight: '700' },
});

export default RegisterScreen;
