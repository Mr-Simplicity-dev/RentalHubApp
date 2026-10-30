const recruitmentCopy = require('../../i18n/recruitmentCopy.cjs');
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {Animated,
  AccessibilityInfo,
  Easing,
  Image,
  StatusBar,
  StyleSheet,
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
  const { height, width, fontScale = 1 } = useWindowDimensions();
  const { isRTL, t, textAlign, language } = useLanguage();
  const careersCopy=recruitmentCopy[language]||recruitmentCopy.en;
  const compact = height < 820 || width < 380;
  const short = height < 720;
  const tiny = height < 600 || (height < 640 && width < 340);
  const stackCareers = width < 360 || fontScale > 1.3;
  const textDirection = isRTL ? 'rtl' : 'ltr';
  const contentY = useRef(new Animated.Value(22)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const hintBounce = useRef(new Animated.Value(0)).current;
  const careerGlow = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(true);
  const [careerWidth, setCareerWidth] = useState(Math.max(width - 48, 0));
  const [careerHeight, setCareerHeight] = useState(68);
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

  return (
    <SafeAreaView style={[styles.safeArea, compact && styles.safeAreaCompact]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.navy} />
      <Image source={logo} style={styles.watermark} resizeMode="contain" pointerEvents="none" />
      <View style={styles.orbTop} pointerEvents="none" />
      <View style={styles.orbBottom} pointerEvents="none" />

      <View style={styles.body}>
      <View style={[styles.bodyContent, compact && styles.bodyContentCompact, short && styles.bodyContentShort, tiny && styles.bodyContentTiny]}>
      <View style={[styles.top, compact && styles.topCompact, tiny && styles.topTiny]}>
        <BrandMark light compact />
        <TouchableOpacity
          accessibilityLabel={t('welcome.explore')}
          accessibilityRole="button"
          onPress={() => navigateOnce('Home')}
          style={[styles.exploreButton, short && styles.exploreButtonShort, tiny && styles.exploreButtonTiny]}>
          <AppText style={[styles.exploreText, short && styles.exploreTextShort, { textAlign, writingDirection: textDirection }]}>{t('welcome.explore')}</AppText>
          <Icon name="arrow-forward" size={17} color={colors.white} />
        </TouchableOpacity>
      </View>

      <View style={[styles.exploreHintWrap, short && styles.exploreHintWrapShort, tiny && styles.exploreHintWrapTiny]} pointerEvents="none">
        <View style={[styles.exploreArrow, tiny && styles.exploreArrowTiny]} />
        <Animated.View style={[styles.exploreHint, short && styles.exploreHintShort, { transform: [{ translateY: hintBounce }] }]}>
          <Icon name="arrow-up" size={13} color={colors.navy} />
          <AppText style={[styles.exploreHintText, short && styles.exploreHintTextShort, { textAlign, writingDirection: textDirection }]}>{t('welcome.exploreHint')}</AppText>
        </Animated.View>
      </View>

      {/* Language choice sits before sign-in so the whole app can follow it.
          Centred on its own full-width row, below the "click here" hint and
          clear of the eyebrow, so it never crowds either. */}
      <View style={[styles.languageRow, compact && styles.languageRowCompact, short && styles.languageRowShort, tiny && styles.languageRowTiny]}>
        <LanguageDropdown fullWidth tone="dark" compact={short || tiny} />
      </View>

      <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentY }] }}>
        <View style={[styles.eyebrow, compact && styles.eyebrowCompact, short && styles.eyebrowShort]}>
          <View style={styles.eyebrowDot} />
          <AppText style={[styles.eyebrowText, short && styles.eyebrowTextShort, isRTL && styles.eyebrowTextRTL, { textAlign, writingDirection: textDirection }]}>{t('welcome.eyebrow')}</AppText>
        </View>
        <AppText accessibilityRole="header" style={[styles.title, compact && styles.titleCompact, short && styles.titleShort, tiny && styles.titleTiny, isRTL && styles.titleRTL, { textAlign: 'center', writingDirection: textDirection }]}>{t('welcome.title')}</AppText>
        <AppText style={[styles.subtitle, compact && styles.subtitleCompact, short && styles.subtitleShort, tiny && styles.subtitleTiny, { textAlign: 'center', writingDirection: textDirection }]}>
          {t('welcome.subtitle')}
        </AppText>

        <View style={[styles.actions, compact && styles.actionsCompact, short && styles.actionsShort, tiny && styles.actionsTiny]}>
          <TouchableOpacity
            accessibilityLabel={t('welcome.createAccount')}
            accessibilityRole="button"
            activeOpacity={0.86}
            onPress={() => navigateOnce('Register')}
            style={[styles.primaryButton, compact && styles.primaryButtonCompact, short && styles.primaryButtonShort]}>
            <AppText style={[styles.primaryText, compact && styles.buttonTextCompact, short && styles.buttonTextShort, { textAlign: 'center', writingDirection: textDirection }]}>{t('welcome.createAccount')}</AppText>
            <View style={styles.primaryIcon}>
              <Icon name="arrow-forward" size={19} color={colors.navy} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel={t('welcome.signIn')}
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={() => navigateOnce('Login')}
            style={[styles.secondaryButton, compact && styles.secondaryButtonCompact, short && styles.secondaryButtonShort]}>
            <AppText style={[styles.secondaryText, compact && styles.buttonTextCompact, short && styles.buttonTextShort, { textAlign: 'center', writingDirection: textDirection }]}>{t('welcome.signIn')}</AppText>
          </TouchableOpacity>
        </View>

        <View style={[styles.careersGlowWrap, compact && styles.careersGlowWrapCompact, short && styles.careersGlowWrapShort, tiny && styles.careersGlowWrapTiny]}>
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
            style={[styles.careersButton, stackCareers && styles.careersButtonStacked, short && styles.careersButtonShort, tiny && styles.careersButtonTiny]}>
            {!reduceMotion && (
              <>
                <Animated.View pointerEvents="none" style={[styles.careerGlowAura, { transform: [{ translateX: careerGlowX }, { translateY: careerGlowY }] }]} />
                <Animated.View pointerEvents="none" style={[styles.careerGlowHalo, { transform: [{ translateX: careerGlowX }, { translateY: careerGlowY }] }]} />
                <Animated.View pointerEvents="none" style={[styles.careerGlowDot, { transform: [{ translateX: careerGlowX }, { translateY: careerGlowY }] }]} />
              </>
            )}
            <AppText style={[styles.careerTitle, compact && styles.careerTitleCompact, short && styles.careerTitleShort, tiny && styles.careerTitleTiny, stackCareers && styles.careerTitleStacked, { writingDirection: textDirection }]}>{careersCopy.opportunities_title}</AppText>
            <View style={styles.careerApply}>
              <AppText style={[styles.careerApplyText, compact && styles.careerApplyTextCompact, short && styles.careerApplyTextShort, { writingDirection: textDirection }]}>{careersCopy.apply}</AppText>
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.trustRow, compact && styles.trustRowCompact, short && styles.trustRowShort, tiny && styles.trustRowTiny]}>
          <Icon name="shield-checkmark" size={15} color="#8DB9F2" />
          <AppText style={[styles.trustText, short && styles.trustTextShort, { textAlign, writingDirection: textDirection }]}>{t('welcome.trust')}</AppText>
        </View>

      </Animated.View>
      </View>
      </View>

      {/* App update prompt — overlays the welcome content so it never shifts layout. */}
      <AppUpdateIndicator variant="overlay" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  careersGlowWrap: {
    marginTop: 12,
  },
  careersGlowWrapCompact: {
    marginTop: 10,
  },
  careersGlowWrapShort: {
    marginTop: 7,
  },
  careersGlowWrapTiny: {
    marginTop: 4,
  },
  careersButton: {
    alignItems: 'center',
    backgroundColor: '#0D2A63',
    borderColor: 'rgba(127,227,255,0.38)',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 68,
    paddingHorizontal: 14,
    paddingVertical: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  careersButtonStacked: {
    flexDirection: 'column',
    gap: 4,
    minHeight: 72,
  },
  careersButtonShort: {
    paddingVertical: 6,
  },
  careersButtonTiny: {
    minHeight: 54,
    paddingVertical: 4,
  },
  careerGlowAura: {
    backgroundColor: 'rgba(127,227,255,0.10)',
    borderRadius: 16,
    height: 32,
    left: -16,
    position: 'absolute',
    top: -16,
    width: 32,
  },
  careerGlowHalo: {
    backgroundColor: 'rgba(127,227,255,0.22)',
    borderRadius: 8,
    height: 16,
    left: -8,
    position: 'absolute',
    top: -8,
    width: 16,
  },
  careerGlowDot: {
    backgroundColor: 'rgba(207,248,255,0.65)',
    borderRadius: 2,
    height: 4,
    left: -2,
    position: 'absolute',
    top: -2,
    width: 4,
  },
  careerTitle: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: typeScale.reading,
    lineHeight: 21,
    textAlign: 'center',
    flex: 1,
    minWidth: 0,
  },
  careerTitleCompact: {
    fontSize: 14,
    lineHeight: 19,
  },
  careerTitleShort: {
    fontSize: 12,
    lineHeight: 16,
  },
  careerTitleTiny: {
    fontSize: 11,
    lineHeight: 15,
  },
  careerTitleStacked: {
    flex: 0,
    width: '100%',
  },
  careerApply: {
    backgroundColor: 'rgba(34,112,207,0.30)',
    borderRadius: radius.pill,
    maxWidth: '45%',
    flexShrink: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  careerApplyText: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: typeScale.sm,
    lineHeight: 19,
    textAlign: 'center',
  },
  careerApplyTextCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  careerApplyTextShort: {
    fontSize: 11,
    lineHeight: 15,
  },
  safeArea: {
    direction: 'ltr',
    backgroundColor: colors.navy,
    flex: 1,
    overflow: 'hidden',
    paddingHorizontal: 24,
  },
  safeAreaCompact: {
    paddingHorizontal: 18,
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
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  topCompact: {
    paddingTop: 4,
  },
  topTiny: {
    paddingTop: 0,
  },
  languageRow: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 32,
    paddingHorizontal: 24,
    width: '100%',
  },
  languageRowCompact: {
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  languageRowShort: {
    marginTop: 4,
    marginBottom: 24,
    paddingHorizontal: 2,
  },
  languageRowTiny: {
    marginTop: 2,
    marginBottom: 24,
    paddingHorizontal: 0,
  },
  exploreButton: {
    flexShrink: 1,
    maxWidth: '48%',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    paddingVertical: 10,
  },
  exploreButtonShort: {
    gap: 5,
    paddingVertical: 5,
  },
  exploreButtonTiny: {
    paddingVertical: 3,
  },
  exploreText: {
    flexShrink: 1,
    color: '#DDEBFF',
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  exploreTextShort: {
    fontSize: 11,
    lineHeight: 15,
  },
  exploreHintWrap: {
    direction: 'ltr',
    alignItems: 'flex-end',
    marginTop: 4,
    marginBottom: 2,
    paddingRight: 6,
  },
  exploreHintWrapShort: {
    marginTop: 0,
    marginBottom: 1,
    paddingRight: 4,
  },
  exploreHintWrapTiny: {
    marginTop: 0,
    marginBottom: 0,
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
  exploreArrowTiny: {
    borderBottomWidth: 7,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    marginRight: 14,
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
  exploreHintShort: {
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  exploreHintText: {
    flexShrink: 1,
    color: colors.navy,
    fontFamily: typography.bold,
    fontSize: typeScale.reading,
    lineHeight: 22,
  },
  exploreHintTextShort: {
    fontSize: 11,
    lineHeight: 15,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    flex: 1,
    paddingBottom: 22,
  },
  bodyContentCompact: {
    paddingBottom: 14,
  },
  bodyContentShort: {
    paddingBottom: 8,
  },
  bodyContentTiny: {
    paddingBottom: 2,
  },
  eyebrow: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 14,
  },
  eyebrowCompact: {
    marginBottom: 10,
  },
  eyebrowShort: {
    marginBottom: 6,
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
  eyebrowTextShort: {
    fontSize: 10,
    lineHeight: 14,
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
    lineHeight: 34,
  },
  titleRTL: {
    letterSpacing: 0,
  },
  titleCompact: {
    fontSize: 26,
    lineHeight: 31,
  },
  titleShort: {
    fontSize: 22,
    lineHeight: 27,
  },
  titleTiny: {
    fontSize: 20,
    lineHeight: 24,
  },
  subtitle: {
    alignSelf: 'center',
    width: '100%',
    textAlign: 'center',
    color: '#B7C8E2',
    fontFamily: typography.regular,
    fontSize: typeScale.reading,
    lineHeight: 21,
    marginTop: 14,
    maxWidth: 355,
  },
  subtitleCompact: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  subtitleShort: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 6,
  },
  subtitleTiny: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
  },
  actions: {
    gap: 12,
    marginTop: 28,
  },
  actionsCompact: {
    gap: 10,
    marginTop: 20,
  },
  actionsShort: {
    gap: 8,
    marginTop: 10,
  },
  actionsTiny: {
    gap: 6,
    marginTop: 8,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    flexDirection: 'row',
    minHeight: 58,
    justifyContent: 'center',
    paddingHorizontal: 54,
    paddingVertical: 12,
    ...shadows.soft,
  },
  primaryButtonCompact: {
    paddingHorizontal: 46,
    paddingVertical: 10,
  },
  primaryButtonShort: {
    paddingHorizontal: 40,
    paddingVertical: 8,
  },
  primaryText: {
    width: '100%',
    textAlign: 'center',
    color: colors.navy,
    fontFamily: typography.bold,
    fontSize: typeScale.reading,
    lineHeight: 22,
  },
  buttonTextCompact: {
    fontSize: 14,
    lineHeight: 20,
  },
  buttonTextShort: {
    fontSize: 13,
    lineHeight: 18,
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
    minHeight: 54,
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  secondaryButtonCompact: {
    minHeight: 50,
    paddingVertical: 10,
  },
  secondaryButtonShort: {
    minHeight: 46,
    paddingVertical: 8,
  },
  secondaryText: {
    textAlign: 'center',
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: typeScale.reading,
    lineHeight: 22,
  },
  trustRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  trustRowCompact: {
    marginTop: 12,
  },
  trustRowShort: {
    marginTop: 8,
  },
  trustRowTiny: {
    marginTop: 5,
  },
  trustText: {
    flexShrink: 1,
    color: '#8FA8CA',
    fontFamily: typography.medium,
    fontSize: 12,
    lineHeight: 17,
    marginStart: 7,
  },
  trustTextShort: {
    fontSize: 10,
    lineHeight: 14,
  },
});

export default WelcomeScreen;
