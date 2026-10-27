const recruitmentCopy = require('../../i18n/recruitmentCopy.cjs');
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {Animated,
  AccessibilityInfo,
  Easing,
  Image,
  StatusBar,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  View,} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import BrandMark from '../../components/brand/BrandMark';
import AppUpdateIndicator from '../../components/common/AppUpdateIndicator';
import LanguageDropdown from '../../components/common/LanguageDropdown';
import { useLanguage } from '../../context/LanguageContext';
import { colors, radius, shadows, typography, typeScale } from '../../theme';
import AppText from '../../components/common/AppText';

const logo = require('../../../assets/rentalhub-app-icon.png');
const CAREER_GLOW_DURATION = 7200;

const WelcomeScreen = ({ navigation }) => {
  const { height, width } = useWindowDimensions();
  const { isRTL, t, textAlign, language } = useLanguage();
  const careersCopy=recruitmentCopy[language]||recruitmentCopy.en;
  const compact = height < 720 || width < 360;
  const textDirection = isRTL ? 'rtl' : 'ltr';
  const contentY = useRef(new Animated.Value(22)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const hintBounce = useRef(new Animated.Value(0)).current;
  const careerGlow = useRef(new Animated.Value(0)).current;
  const careerPulse = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(true);
  const [careerWidth, setCareerWidth] = useState(Math.max(width - 48, 0));
  const [careerHeight, setCareerHeight] = useState(108);
  const navigatingRef = useRef(false);
  const navigateTimerRef = useRef(null);

  const navigateOnce = useCallback((routeName) => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    navigation.navigate(routeName);
    if (navigateTimerRef.current) {
      clearTimeout(navigateTimerRef.current);
    }
    navigateTimerRef.current = setTimeout(() => {
      navigatingRef.current = false;
      navigateTimerRef.current = null;
    }, 700);
  }, [navigation]);

  useEffect(() => () => {
    if (navigateTimerRef.current) {
      clearTimeout(navigateTimerRef.current);
      navigateTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    careerGlow.setValue(0);
    if (reduceMotion) return undefined;
    const loop = Animated.loop(Animated.timing(careerGlow, {
      toValue: 1,
      duration: CAREER_GLOW_DURATION,
      easing: Easing.linear,
      useNativeDriver: true,
    }));
    loop.start();
    return () => loop.stop();
  }, [careerGlow, reduceMotion]);
  useEffect(() => {
    careerPulse.setValue(0);
    if (reduceMotion) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(careerPulse, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(careerPulse, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [careerPulse, reduceMotion]);
  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentY, {
        toValue: 0,
        duration: 560,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 560,
        useNativeDriver: true,
      }),
    ]).start();
  }, [contentOpacity, contentY]);

  useEffect(() => {
    if (reduceMotion) { hintBounce.setValue(0); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(hintBounce, { toValue: -7, duration: 520, useNativeDriver: true }),
        Animated.timing(hintBounce, { toValue: 0, duration: 520, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [hintBounce, reduceMotion]);

  const careerGlowX = careerGlow.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, careerWidth, careerWidth, 0, 0],
  });
  const careerGlowY = careerGlow.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, 0, careerHeight, careerHeight, 0],
  });
  const careerPulseOpacity = careerPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.26, 0.9],
  });
  const careerPulseScale = careerPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.035],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.navy} />
      <Image source={logo} style={styles.watermark} resizeMode="contain" pointerEvents="none" />
      <View style={styles.orbTop} pointerEvents="none" />
      <View style={styles.orbBottom} pointerEvents="none" />

      <View style={styles.top}>
        <BrandMark light compact />
        <TouchableOpacity
          accessibilityLabel={t('welcome.explore')}
          accessibilityRole="button"
          onPress={() => navigateOnce('Home')}
          style={styles.exploreButton}>
          <AppText style={[styles.exploreText, { textAlign, writingDirection: textDirection }]}>{t('welcome.explore')}</AppText>
          <Icon name="arrow-forward" size={17} color={colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.exploreHintWrap} pointerEvents="none">
        <View style={styles.exploreArrow} />
        <Animated.View style={[styles.exploreHint, { transform: [{ translateY: hintBounce }] }]}>
          <Icon name="arrow-up" size={13} color={colors.navy} />
          <AppText style={[styles.exploreHintText, { textAlign, writingDirection: textDirection }]}>{t('welcome.exploreHint')}</AppText>
        </Animated.View>
      </View>

      {/* Language choice sits before sign-in so the whole app can follow it.
          Centred on its own full-width row, below the "click here" hint and
          clear of the eyebrow, so it never crowds either. */}
      <View style={styles.languageRow}>
        <LanguageDropdown fullWidth tone="dark" />
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={[styles.bodyContent, compact && styles.bodyContentCompact]}
        showsVerticalScrollIndicator={false}>
      <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentY }] }}>
        <View style={styles.eyebrow}>
          <View style={styles.eyebrowDot} />
          <AppText style={[styles.eyebrowText, isRTL && styles.eyebrowTextRTL, { textAlign, writingDirection: textDirection }]}>{t('welcome.eyebrow')}</AppText>
        </View>
        <AppText accessibilityRole="header" style={[styles.title, compact && styles.titleCompact, isRTL && styles.titleRTL, { textAlign: 'center', writingDirection: textDirection }]}>{t('welcome.title')}</AppText>
        <AppText style={[styles.subtitle, { textAlign: 'center', writingDirection: textDirection }]}>
          {t('welcome.subtitle')}
        </AppText>

        <View style={styles.actions}>
          <TouchableOpacity
            accessibilityLabel={t('welcome.createAccount')}
            accessibilityRole="button"
            activeOpacity={0.86}
            onPress={() => navigateOnce('Register')}
            style={styles.primaryButton}>
            <AppText style={[styles.primaryText, { textAlign: 'center', writingDirection: textDirection }]}>{t('welcome.createAccount')}</AppText>
            <View style={styles.primaryIcon}>
              <Icon name="arrow-forward" size={19} color={colors.navy} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel={t('welcome.signIn')}
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={() => navigateOnce('Login')}
            style={styles.secondaryButton}>
            <AppText style={[styles.secondaryText, { textAlign: 'center', writingDirection: textDirection }]}>{t('welcome.signIn')}</AppText>
          </TouchableOpacity>
        </View>

        <View style={styles.careersGlowWrap}>
          {!reduceMotion && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.careerPulseRing,
                { opacity: careerPulseOpacity, transform: [{ scale: careerPulseScale }] },
              ]}
            />
          )}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={careersCopy.opportunities_title + '. ' + careersCopy.apply}
            activeOpacity={0.88}
            onLayout={event => {
              const layout = event.nativeEvent.layout;
              setCareerWidth(Math.max(layout.width, 0));
              setCareerHeight(Math.max(layout.height, 0));
            }}
            onPress={() => navigateOnce('Careers')}
            style={styles.careersButton}>
            {!reduceMotion && (
              <>
                <Animated.View pointerEvents="none" style={[styles.careerGlowAura, { transform: [{ translateX: careerGlowX }, { translateY: careerGlowY }] }]} />
                <Animated.View pointerEvents="none" style={[styles.careerGlowHalo, { transform: [{ translateX: careerGlowX }, { translateY: careerGlowY }] }]} />
                <Animated.View pointerEvents="none" style={[styles.careerGlowDot, { transform: [{ translateX: careerGlowX }, { translateY: careerGlowY }] }]} />
              </>
            )}
            <AppText style={[styles.careerTitle, { writingDirection: textDirection }]}>{careersCopy.opportunities_title}</AppText>
            <View style={styles.careerApply}>
              <AppText style={[styles.careerApplyText, { writingDirection: textDirection }]}>{careersCopy.apply}</AppText>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.trustRow}>
          <Icon name="shield-checkmark" size={17} color="#8DB9F2" />
          <AppText style={[styles.trustText, { textAlign, writingDirection: textDirection }]}>{t('welcome.trust')}</AppText>
        </View>

      </Animated.View>
      </ScrollView>

      {/* App update prompt — overlays the welcome content so it never shifts layout. */}
      <AppUpdateIndicator variant="overlay" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  careersGlowWrap: {
    backgroundColor: 'rgba(79,195,255,0.22)',
    borderColor: 'rgba(127,227,255,0.82)',
    borderRadius: radius.md + 4,
    borderWidth: 1.5,
    marginTop: 16,
    padding: 2,
    position: 'relative',
    shadowColor: '#7FE3FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 24,
    elevation: 12,
  },
  careerPulseRing: {
    ...StyleSheet.absoluteFillObject,
    borderColor: 'rgba(170,239,255,0.95)',
    borderRadius: radius.md + 4,
    borderWidth: 2,
  },
  careersButton: {
    alignItems: 'center',
    backgroundColor: '#0D2A63',
    borderColor: '#7FE3FF',
    borderRadius: radius.md,
    borderWidth: 1.5,
    gap: 12,
    justifyContent: 'center',
    minHeight: 108,
    paddingHorizontal: 20,
    paddingVertical: 16,
    position: 'relative',
  },
  careerGlowAura: {
    backgroundColor: 'rgba(127,227,255,0.24)',
    borderRadius: 27,
    height: 54,
    left: -27,
    position: 'absolute',
    top: -27,
    width: 54,
  },
  careerGlowHalo: {
    backgroundColor: 'rgba(127,227,255,0.5)',
    borderColor: 'rgba(225,250,255,0.8)',
    borderRadius: 15,
    borderWidth: 1,
    height: 30,
    left: -15,
    position: 'absolute',
    top: -15,
    width: 30,
  },
  careerGlowDot: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CFF8FF',
    borderRadius: 5,
    borderWidth: 1,
    height: 10,
    left: -5,
    position: 'absolute',
    shadowColor: '#7FE3FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    top: -5,
    width: 10,
  },
  careerTitle: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: typeScale.base,
    lineHeight: 24,
    textAlign: 'center',
    width: '100%',
  },
  careerApply: {
    backgroundColor: '#2270CF',
    borderRadius: radius.pill,
    maxWidth: '100%',
    paddingHorizontal: 26,
    paddingVertical: 8,
  },
  careerApplyText: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: typeScale.reading,
    lineHeight: 22,
    textAlign: 'center',
  },
  safeArea: {
    direction: 'ltr',
    backgroundColor: colors.navy,
    flex: 1,
    overflow: 'hidden',
    paddingHorizontal: 24,
  },
  watermark: {
    height: 430,
    opacity: 0.055,
    position: 'absolute',
    right: -145,
    top: 110,
    transform: [{ rotate: '-9deg' }],
    width: 430,
  },
  orbTop: {
    backgroundColor: colors.blue,
    borderRadius: 170,
    height: 300,
    opacity: 0.14,
    position: 'absolute',
    right: -180,
    top: -130,
    width: 300,
  },
  orbBottom: {
    backgroundColor: colors.blueBright,
    borderRadius: 170,
    bottom: -190,
    height: 340,
    left: -190,
    opacity: 0.1,
    position: 'absolute',
    width: 340,
  },
  top: {
    direction: 'ltr',
    direction: 'ltr',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  languageRow: {
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 26,
    paddingHorizontal: 24,
    width: '100%',
  },
  exploreButton: {
    flexShrink: 1,
    maxWidth: '48%',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    paddingVertical: 10,
  },
  exploreText: {
    flexShrink: 1,
    color: '#DDEBFF',
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  exploreHintWrap: {
    direction: 'ltr',
    alignItems: 'flex-end',
    marginTop: 4,
    marginBottom: 2,
    paddingRight: 6,
  },
  exploreArrow: {
    borderBottomColor: colors.gold,
    borderBottomWidth: 9,
    borderLeftColor: 'transparent',
    borderLeftWidth: 8,
    borderRightColor: 'transparent',
    borderRightWidth: 8,
    height: 0,
    marginRight: 18,
    width: 0,
  },
  exploreHint: {
    direction: 'ltr',
    maxWidth: '100%',
    alignItems: 'center',
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    ...shadows.soft,
  },
  exploreHintText: {
    flexShrink: 1,
    color: colors.navy,
    fontFamily: typography.bold,
    fontSize: typeScale.reading,
    lineHeight: 22,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingBottom: 30,
    paddingTop: 32,
  },
  bodyContentCompact: {
    paddingBottom: 18,
    paddingTop: 20,
  },
  eyebrow: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 18,
  },
  eyebrowDot: {
    backgroundColor: colors.gold,
    borderRadius: 4,
    height: 7,
    marginEnd: 9,
    width: 7,
  },
  eyebrowText: {
    flexShrink: 1,
    textAlign: 'center',
    color: '#A9C9F7',
    fontFamily: typography.bold,
    fontSize: typeScale.xs,
    lineHeight: 18,
    letterSpacing: 0.8,
  },
  eyebrowTextRTL: {
    letterSpacing: 0,
  },
  title: {
    width: '100%',
    textAlign: 'center',
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: typeScale.xxl,
    letterSpacing: -0.3,
    lineHeight: 36,
  },
  titleRTL: {
    letterSpacing: 0,
  },
  titleCompact: {
    fontSize: typeScale.xxl,
    lineHeight: 36,
  },
  subtitle: {
    alignSelf: 'center',
    width: '100%',
    textAlign: 'center',
    color: '#B7C8E2',
    fontFamily: typography.regular,
    fontSize: typeScale.base,
    lineHeight: 24,
    marginTop: 18,
    maxWidth: 355,
  },
  actions: {
    gap: 12,
    marginTop: 34,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    flexDirection: 'row',
    minHeight: 58,
    justifyContent: 'center',
    paddingHorizontal: 54,
    paddingVertical: 14,
    ...shadows.soft,
  },
  primaryText: {
    width: '100%',
    textAlign: 'center',
    color: colors.navy,
    fontFamily: typography.bold,
    fontSize: typeScale.base,
    lineHeight: 24,
  },
  primaryIcon: {
    position: 'absolute',
    right: 10,
    top: 10,
    alignItems: 'center',
    backgroundColor: colors.gold,
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 56,
    paddingHorizontal: 20,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  secondaryText: {
    textAlign: 'center',
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: typeScale.base,
    lineHeight: 24,
  },
  trustRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 22,
  },
  trustText: {
    flexShrink: 1,
    color: '#8FA8CA',
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginStart: 7,
  },
});

export default WelcomeScreen;
