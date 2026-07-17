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
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import BrandMark from '../../components/brand/BrandMark';
import Toast from 'react-native-toast-message';
import { biometricService } from '../../services/biometricService';
import { colors, radius, shadows, typography } from '../../theme';

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
  const { login, loginWithBiometrics } = useContext(AuthContext);

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
      const response = await login(email, password);
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <TouchableOpacity
              accessibilityLabel="Go back"
              accessibilityRole="button"
              onPress={() => navigation.goBack()}
              style={styles.backButton}>
              <Icon name="arrow-back" size={22} color={colors.navy} />
            </TouchableOpacity>
            <BrandMark compact />
            <View style={styles.topBarSpacer} />
          </View>

          <View style={styles.header}>
            <Text style={styles.eyebrow}>WELCOME BACK</Text>
            <Text style={styles.title}>Good to see you again.</Text>
            <Text style={styles.subtitle}>
              Sign in to continue managing your RentalHub experience.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Input
              label="Email address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              icon="mail-outline"
              autoCapitalize="none"
              autoComplete="email"
            />

            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              icon="lock-closed-outline"
              autoComplete="current-password"
            />

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>

            <Button
              title="Sign in"
              onPress={handleLogin}
              loading={loading}
              size="lg"
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
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>New to RentalHub?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.signUpText}> Create an account</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('AcceptLawyerInvite')}
            style={styles.inviteLink}>
            <Icon name="briefcase-outline" size={16} color={colors.muted} />
            <Text style={styles.inviteText}>I received a lawyer invitation</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 28,
    paddingHorizontal: 22,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
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
  topBarSpacer: {
    width: 42,
  },
  header: {
    marginBottom: 25,
    marginTop: 35,
  },
  eyebrow: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 32,
    letterSpacing: -1,
    lineHeight: 39,
  },
  subtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 10,
  },
  formCard: {
    backgroundColor: colors.white,
    borderColor: '#E8EDF5',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 20,
    ...shadows.soft,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 21,
    marginTop: -2,
  },
  forgotPasswordText: {
    color: colors.blue,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  loginButton: {
    marginBottom: 0,
  },
  biometricButton: {
    marginTop: 12,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 27,
  },
  footerText: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 14,
  },
  signUpText: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 14,
  },
  inviteLink: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 7,
    marginTop: 20,
    padding: 8,
  },
  inviteText: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 12,
  },
});

export default LoginScreen;
