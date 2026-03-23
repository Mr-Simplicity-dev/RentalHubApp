import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Toast from 'react-native-toast-message';
import { authService } from '../../services/authService';
import { biometricService } from '../../services/biometricService';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState({
    available: false,
    enabled: false,
    label: 'Biometrics',
  });
  const { establishSession, loginWithBiometrics } = useContext(AuthContext);

  useEffect(() => {
    const loadBiometricStatus = async () => {
      const status = await biometricService.getStatus();
      setBiometricStatus(status);
    };

    loadBiometricStatus();
    const unsubscribe = navigation.addListener('focus', loadBiometricStatus);

    return unsubscribe;
  }, [navigation]);

  const askToEnableBiometricLogin = (label) =>
    new Promise((resolve) => {
      let resolved = false;

      const finish = (value) => {
        if (!resolved) {
          resolved = true;
          resolve(value);
        }
      };

      Alert.alert(
        `Enable ${label}`,
        `Would you like to use ${label.toLowerCase()} for faster sign-in on this device?`,
        [
          {
            text: 'Not now',
            style: 'cancel',
            onPress: () => finish(false),
          },
          {
            text: 'Enable',
            onPress: () => finish(true),
          },
        ],
        {
          cancelable: true,
          onDismiss: () => finish(false),
        }
      );
    });

  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please fill in all fields',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await authService.login(email, password);
      if (response.success) {
        const sessionData = response.data;
        const currentBiometricStatus = await biometricService.getStatus();

        if (currentBiometricStatus.available && currentBiometricStatus.enabled) {
          await biometricService.enableForSession(sessionData);
        } else if (currentBiometricStatus.available && !currentBiometricStatus.enabled) {
          const shouldEnable = await askToEnableBiometricLogin(currentBiometricStatus.label);

          if (shouldEnable) {
            const biometricResult = await biometricService.enableForSession(sessionData);

            if (biometricResult.success) {
              setBiometricStatus((previous) => ({
                ...previous,
                enabled: true,
                available: true,
                label: biometricResult.label || previous.label,
              }));
            } else if (!/cancel/i.test(biometricResult.message || '')) {
              Toast.show({
                type: 'error',
                text1: 'Biometric Login',
                text2: biometricResult.message || 'Unable to enable biometric login right now.',
              });
            }
          }
        }

        await establishSession(sessionData);

        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Login successful!',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response.message || 'Login failed',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || 'Login failed',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    try {
      const response = await loginWithBiometrics();

      if (response.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: `${response.label || 'Biometric'} login successful!`,
        });
      } else if (!response.cancelled) {
        Toast.show({
          type: 'error',
          text1: 'Biometric Login',
          text2: response.message || 'Biometric login failed.',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Biometric Login',
        text2: 'Biometric login failed.',
      });
    } finally {
      setBiometricLoading(false);
      const status = await biometricService.getStatus();
      setBiometricStatus(status);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            icon="mail-outline"
            autoCapitalize="none"
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            icon="lock-closed-outline"
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginButton}
          />

          {biometricStatus.enabled ? (
            <Button
              title={`Use ${biometricStatus.label}`}
              onPress={handleBiometricLogin}
              loading={biometricLoading}
              variant="outline"
              style={styles.biometricButton}
            />
          ) : null}

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.signUpText}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerAlt}>
            <Text style={styles.footerText}>Invited as a lawyer? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('AcceptLawyerInvite')}>
              <Text style={styles.signUpText}>Accept invite</Text>
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
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
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
  form: {
    marginBottom: 24,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#0284c7',
    fontWeight: '500',
  },
  loginButton: {
    marginBottom: 24,
  },
  biometricButton: {
    marginBottom: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerAlt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
  },
  signUpText: {
    fontSize: 14,
    color: '#0284c7',
    fontWeight: '600',
  },
});

export default LoginScreen;
