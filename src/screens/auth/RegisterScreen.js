import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Toast from 'react-native-toast-message';

const RegisterScreen = ({ navigation }) => {
  const [userType, setUserType] = useState('tenant');
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    nin: '',
    password: '',
    confirm_password: '',
  });
  const [loading, setLoading] = useState(false);
  const { register } = useContext(AuthContext);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleRegister = async () => {
    // Validation
    if (
      !formData.full_name ||
      !formData.email ||
      !formData.phone ||
      !formData.nin ||
      !formData.password
    ) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please fill in all fields',
      });
      return;
    }

    if (formData.password !== formData.confirm_password) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Passwords do not match',
      });
      return;
    }

    if (formData.password.length < 8) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Password must be at least 8 characters',
      });
      return;
    }

    if (!/^\d{11}$/.test(formData.nin)) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'NIN must be exactly 11 digits',
      });
      return;
    }

    setLoading(true);
    try {
      const { confirm_password, ...registrationData } = formData;
      const response = await register({
        ...registrationData,
        user_type: userType,
      });

      if (response.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Registration successful!',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response.message || 'Registration failed',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || 'Registration failed',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join RentalHub NG today</Text>
        </View>

        {/* User Type Selection */}
        <View style={styles.userTypeContainer}>
          <Text style={styles.label}>I am a:</Text>
          <View style={styles.userTypeButtons}>
            <TouchableOpacity
              style={[
                styles.userTypeButton,
                userType === 'tenant' && styles.userTypeButtonActive,
              ]}
              onPress={() => setUserType('tenant')}>
              <Text
                style={[
                  styles.userTypeButtonText,
                  userType === 'tenant' && styles.userTypeButtonTextActive,
                ]}>
                Tenant
              </Text>
              <Text style={styles.userTypeDescription}>Looking for property</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.userTypeButton,
                userType === 'landlord' && styles.userTypeButtonActive,
              ]}
              onPress={() => setUserType('landlord')}>
              <Text
                style={[
                  styles.userTypeButtonText,
                  userType === 'landlord' && styles.userTypeButtonTextActive,
                ]}>
                Landlord
              </Text>
              <Text style={styles.userTypeDescription}>Listing property</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Input
            label="Full Name *"
            value={formData.full_name}
            onChangeText={(value) => handleChange('full_name', value)}
            placeholder="John Doe"
            icon="person-outline"
          />

          <Input
            label="Email Address *"
            value={formData.email}
            onChangeText={(value) => handleChange('email', value)}
            placeholder="john@example.com"
            keyboardType="email-address"
            icon="mail-outline"
            autoCapitalize="none"
          />

          <Input
            label="Phone Number *"
            value={formData.phone}
            onChangeText={(value) => handleChange('phone', value)}
            placeholder="08012345678"
            keyboardType="phone-pad"
            icon="call-outline"
          />

          <Input
            label="NIN (National ID Number) *"
            value={formData.nin}
            onChangeText={(value) => handleChange('nin', value)}
            placeholder="12345678901"
            keyboardType="number-pad"
            icon="card-outline"
            maxLength={11}
          />

          <Input
            label="Password *"
            value={formData.password}
            onChangeText={(value) => handleChange('password', value)}
            placeholder="Min. 8 characters"
            secureTextEntry
            icon="lock-closed-outline"
          />

          <Input
            label="Confirm Password *"
            value={formData.confirm_password}
            onChangeText={(value) => handleChange('confirm_password', value)}
            placeholder="Re-enter password"
            secureTextEntry
            icon="lock-closed-outline"
          />

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
            style={styles.registerButton}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.signInText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  userTypeContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
  },
  userTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  userTypeButton: {
    flex: 1,
    padding: 16,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 12,
    alignItems: 'center',
  },
  userTypeButtonActive: {
    borderColor: '#0284c7',
    backgroundColor: '#eff6ff',
  },
  userTypeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  userTypeButtonTextActive: {
    color: '#0284c7',
  },
  userTypeDescription: {
    fontSize: 12,
    color: '#9ca3af',
  },
  form: {
    marginBottom: 24,
  },
  registerButton: {
    marginTop: 8,
    marginBottom: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
  },
  signInText: {
    fontSize: 14,
    color: '#0284c7',
    fontWeight: '600',
  },
});

export default RegisterScreen;