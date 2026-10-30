import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useState, useContext, useEffect, useRef } from 'react';
import {View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  TouchableOpacity,
  Alert,
  StatusBar,
  useWindowDimensions,} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import BrandMark from '../../components/brand/BrandMark';
import Toast from 'react-native-toast-message';
import TurnstileWidget from '../../components/common/TurnstileWidget';
import { biometricService } from '../../services/biometricService';
import { reportMobileCrash } from '../../services/mobileDiagnosticsService';
import { colors, radius, shadows, typography, typeScale } from '../../theme';

import AppText from '../../components/common/AppText';
import {useLanguage} from '../../context/LanguageContext';
import assistedCopy from '../../i18n/assistedRegistration.json';
const LoginScreen = ({ navigation }) => {
  useInterfaceLanguage();
  const { height, width } = useWindowDimensions();
  const compact = height < 760 || width < 360;
  const short = height < 650;
  const {language}=useLanguage();const identityLabel=(assistedCopy[language]||assistedCopy.en).identity;
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState({
    available: false,
    enabled: false,
    label: ui("Biometrics"),
  });
  const { login, loginWithBiometrics } = useContext(AuthContext);
  const turnstileTokenRef = useRef(null);
  const turnstileRef = useRef(null);

  useEffect(() => {
    const loadBiometricStatus = async () => {
      const status = await biometricService.getStatus();
      setBiometricStatus(status);
    };

    loadBiometricStatus();
    const unsubscribe = navigation.addListener('focus', loadBiometricStatus);

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hidden = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

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
        ui('Enable biometric sign-in'),
        ui('Use your fingerprint or face to sign in faster on this device.'),
        [
          {
            text: ui('Not now'),
            style: 'cancel',
            onPress: () => finish(false),
          },
          {
            text: ui('Enable'),
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
        text1: ui("Error"),
        text2: ui("Please fill in all fields"),
      });
      return;
    }

    const turnstileToken = turnstileTokenRef.current;
    if (!turnstileToken) {
      Toast.show({
        type: 'error',
        text1: ui("Security Check"),
        text2: ui("Please complete the security check below."),
      });
      return;
    }

    setLoading(true);
    try {
      const response = await login(email, password, turnstileToken);
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
                text1: ui("Biometric Login"),
                text2: ui(biometricResult.message || "Unable to enable biometric login right now."),
              });
            }
          }
        }

        Toast.show({
          type: 'success',
          text1: ui("Success"),
          text2: ui("Login successful!"),
        });
      } else {
        Toast.show({
          type: 'error',
          text1: ui("Error"),
          text2: ui(response.message || "Login failed"),
        });
        turnstileRef.current?.reset();
        turnstileTokenRef.current = null;
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Error"),
        text2: ui(error?.response?.data?.message || error?.message || "Login failed"),
      });
      reportMobileCrash(error, {}, { fatal: false, source: 'login_handler' });
      turnstileRef.current?.reset();
      turnstileTokenRef.current = null;
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
          text1: ui("Success"),
          text2: ui('Biometric login successful!'),
        });
      } else if (!response.cancelled) {
        Toast.show({
          type: 'error',
          text1: ui("Biometric Login"),
          text2: ui(response.message || 'Biometric login failed.'),
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Biometric Login"),
        text2: ui("Biometric login failed."),
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
          contentContainerStyle={[styles.scrollContent, compact && styles.scrollContentCompact, short && styles.scrollContentShort]}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={(_, nextHeight) => setContentHeight(nextHeight)}
          onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
          scrollEnabled={keyboardOpen || contentHeight > viewportHeight + 2}
          showsVerticalScrollIndicator={false}>
          <View style={[styles.topBar, compact && styles.topBarCompact]}>
            <TouchableOpacity
              accessibilityLabel={ui("Go back")}
              accessibilityRole="button"
              onPress={() => navigation.goBack()}
              style={styles.backButton}>
              <Icon name="arrow-back" size={22} color={colors.navy} />
            </TouchableOpacity>
            <BrandMark compact />
            <View style={styles.topBarSpacer} />
          </View>

          <View style={[styles.header, compact && styles.headerCompact, short && styles.headerShort, keyboardOpen && styles.hidden]}>
            <AppText style={[styles.eyebrow, compact && styles.eyebrowCompact]}>{ui("WELCOME BACK")}</AppText>
            <AppText style={[styles.title, compact && styles.titleCompact, short && styles.titleShort]}>{ui("Good to see you again.")}</AppText>
            <AppText style={[styles.subtitle, compact && styles.subtitleCompact]}>{ui("Sign in to continue managing your RentalHub experience.")}</AppText>
          </View>

          <View style={[styles.formCard, compact && styles.formCardCompact, short && styles.formCardShort]}>
            <Input
              compact={compact}
              label={identityLabel}
              value={email}
              onChangeText={setEmail}
              placeholder={identityLabel}
              keyboardType="default"
              icon="person-outline"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
            />

            <Input
              compact={compact}
              label={ui("Password")}
              value={password}
              onChangeText={setPassword}
              placeholder={ui("Enter your password")}
              secureTextEntry
              icon="lock-closed-outline"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
            />

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={[styles.forgotPassword, compact && styles.forgotPasswordCompact]}>
              <AppText style={styles.forgotPasswordText}>{ui("Forgot password?")}</AppText>
            </TouchableOpacity>

            <Button
              title={ui("Sign in")}
              onPress={handleLogin}
              loading={loading}
              size={short ? 'md' : 'lg'}
              style={[styles.loginButton, compact && styles.loginButtonCompact]}
            />

        <TurnstileWidget
        action="rentalhub_login"
              ref={turnstileRef}
              onToken={(token) => { turnstileTokenRef.current = token; }}
              onExpire={() => { turnstileTokenRef.current = null; }}
              onError={() => { turnstileTokenRef.current = null; }}
            />

            {biometricStatus.enabled ? (
              <Button
                title={ui('Use biometric sign-in')}
                onPress={handleBiometricLogin}
                loading={biometricLoading}
                variant="outline"
                style={[styles.biometricButton, compact && styles.biometricButtonCompact]}
              />
            ) : null}
          </View>

          <View style={[styles.footer, compact && styles.footerCompact, keyboardOpen && styles.hidden]}>
            <AppText style={styles.footerText}>{ui("New to RentalHub?")}</AppText>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <AppText style={styles.signUpText}>{ui(" Create an account")}</AppText>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('AcceptLawyerInvite')}
            style={[styles.inviteLink, compact && styles.inviteLinkCompact, keyboardOpen && styles.hidden]}>
            <Icon name="briefcase-outline" size={16} color={colors.muted} />
            <AppText style={styles.inviteText}>{ui("I received a lawyer invitation")}</AppText>
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
  scrollContentCompact: {
    paddingBottom: 14,
    paddingHorizontal: 18,
  },
  scrollContentShort: {
    paddingBottom: 8,
    paddingHorizontal: 14,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  topBarCompact: {
    paddingVertical: 6,
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
  headerCompact: {
    marginBottom: 14,
    marginTop: 12,
  },
  headerShort: {
    marginBottom: 10,
    marginTop: 6,
  },
  eyebrow: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: typeScale.xs,
    lineHeight: 18,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  eyebrowCompact: {
    lineHeight: 14,
    marginBottom: 5,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: typeScale.xxl,
    letterSpacing: -0.3,
    lineHeight: 36,
  },
  titleCompact: {
    fontSize: 24,
    lineHeight: 29,
  },
  titleShort: {
    fontSize: 22,
    lineHeight: 26,
  },
  subtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.base,
    lineHeight: 24,
    marginTop: 10,
  },
  subtitleCompact: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 5,
  },
  formCard: {
    backgroundColor: colors.white,
    borderColor: '#E8EDF5',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 20,
    ...shadows.soft,
  },
  formCardCompact: {
    padding: 14,
  },
  formCardShort: {
    padding: 12,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 21,
    marginTop: -2,
  },
  forgotPasswordCompact: {
    marginBottom: 8,
    marginTop: 0,
  },
  forgotPasswordText: {
    color: colors.blue,
    fontFamily: typography.semibold,
    fontSize: typeScale.sm,
    lineHeight: 20,
  },
  loginButton: {
    marginBottom: 0,
  },
  loginButtonCompact: {
    minHeight: 48,
  },
  biometricButton: {
    marginTop: 12,
  },
  biometricButtonCompact: {
    marginTop: 6,
    minHeight: 44,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 27,
  },
  footerCompact: {
    marginTop: 10,
  },
  footerText: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.sm,
    lineHeight: 20,
  },
  signUpText: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: typeScale.sm,
    lineHeight: 20,
  },
  inviteLink: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 7,
    marginTop: 20,
    padding: 8,
  },
  inviteLinkCompact: {
    marginTop: 6,
    padding: 5,
  },
  inviteText: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  hidden: {
    display: 'none',
  },
});

export default LoginScreen;