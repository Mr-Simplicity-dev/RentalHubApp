const recruitmentCopy = require('../../i18n/recruitmentCopy.cjs');
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import BrandMark from '../../components/brand/BrandMark';
import AppUpdateIndicator from '../../components/common/AppUpdateIndicator';
import LanguageDropdown from '../../components/common/LanguageDropdown';
import { useLanguage } from '../../context/LanguageContext';
import { colors, radius, shadows, typography } from '../../theme';
import AppText from '../../components/common/AppText';

const logo = require('../../../assets/rentalhub-app-icon.png');
const CAREER_GLOW_DURATION = 7200;

const WelcomeScreen = ({ navigation }) => {
  const { height, width, fontScale = 1 } = useWindowDimensions();
  const { isRTL, t, textAlign, language } = useLanguage();
  const careersCopy = recruitmentCopy[language] || recruitmentCopy.en;

  // Responsive device thresholds
  const compact = height < 800 || width < 380;
  const short = height < 700;
  const tiny = height < 620;
  const stackCareers = width < 350 || fontScale > 1.25;
  const textDirection = isRTL ? 'rtl' : 'ltr';

  // Animation values
  const contentY = useRef(new Animated.Value(18)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const hintBounce = useRef(new Animated.Value(0)).current;
  const careerGlow = useRef(new Animated.Value(0)).current;

  const [reduceMotion, setReduceMotion] = useState(true);
  const [careerWidth, setCareerWidth] = useState(Math.max(width - 48, 0));
  const [careerHeight, setCareerHeight] = useState(52);

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
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReduceMotion(value);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    careerGlow.setValue(0);
    if (reduceMotion) return undefined;
    const loop = Animated.loop(
      Animated.timing(careerGlow, {
        toValue: 1,
        duration: CAREER_GLOW_DURATION,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [careerGlow, reduceMotion]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentY, {
        toValue: 0,
        duration: 520,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 520,
        useNativeDriver: true,
      }),
    ]).start();
  }, [contentOpacity, contentY]);

  useEffect(() => {
    if (reduceMotion) {
      hintBounce.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(hintBounce, { toValue: -5, duration: 500, useNativeDriver: true }),
        Animated.timing(hintBounce, { toValue: 0, duration: 500, useNativeDriver: true }),
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

  const contentTextAlign = isRTL ? 'right' : 'left';

  return (
    <SafeAreaView style={[styles.safeArea, compact && styles.safeAreaCompact]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.navy} />
      <Image source={logo} style={styles.watermark} resizeMode="contain" pointerEvents="none" />
      <View style={styles.orbTop} pointerEvents="none" />
      <View style={styles.orbBottom} pointerEvents="none" />

      <View style={styles.body}>
        <ScrollView
          contentContainerStyle={[
            styles.bodyScrollContent,
            compact && styles.bodyScrollContentCompact,
            short && styles.bodyScrollContentShort,
            tiny && styles.bodyScrollContentTiny,
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 1. TOP HEADER GROUP */}
          <View style={[styles.headerGroup, compact && styles.headerGroupCompact]}>
            <View style={[styles.top, compact && styles.topCompact]}>
              <BrandMark light compact />
              <TouchableOpacity
                accessibilityLabel={t('welcome.explore')}
                accessibilityRole="button"
                onPress={() => navigateOnce('Home')}
                style={[styles.exploreButton, compact && styles.exploreButtonCompact]}
              >
                <AppText style={[styles.exploreText, compact && styles.exploreTextCompact, { writingDirection: textDirection }]}>
                  {t('welcome.explore')}
                </AppText>
                <Icon name="arrow-forward" size={16} color={colors.white} />
              </TouchableOpacity>
            </View>

            {/* Listed-Properties Hint Banner with Directional Arrow */}
            <TouchableOpacity
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel={t('welcome.exploreHint')}
              onPress={() => navigateOnce('Home')}
              style={[styles.exploreHintWrap, compact && styles.exploreHintWrapCompact, isRTL && styles.exploreHintWrapRTL]}
            >
              <View style={[styles.exploreArrow, compact && styles.exploreArrowCompact]} />
              <Animated.View
                style={[
                  styles.exploreHint,
                  compact && styles.exploreHintCompact,
                  { transform: [{ translateY: hintBounce }] },
                ]}
              >
                <Icon name="arrow-up" size={12} color={colors.navy} />
                <AppText style={[styles.exploreHintText, compact && styles.exploreHintTextCompact, { writingDirection: textDirection }]}>
                  {t('welcome.exploreHint')}
                </AppText>
              </Animated.View>
            </TouchableOpacity>

            {/* Language Selector Dropdown */}
            <View style={[styles.languageRow, compact && styles.languageRowCompact, short && styles.languageRowShort]}>
              <LanguageDropdown fullWidth tone="dark" compact={compact || short} />
            </View>
          </View>

          {/* 2. MIDDLE HERO GROUP (Consistent Left-Aligned Corporate Editorial Layout) */}
          <Animated.View
            style={[
              styles.heroGroup,
              compact && styles.heroGroupCompact,
              short && styles.heroGroupShort,
              { opacity: contentOpacity, transform: [{ translateY: contentY }] },
            ]}
          >
            {/* Introductory Label with Gold Brand Accent Indicator */}
            <View style={[styles.eyebrow, isRTL && styles.eyebrowRTL]}>
              <View style={styles.eyebrowDot} />
              <AppText
                style={[
                  styles.eyebrowText,
                  compact && styles.eyebrowTextCompact,
                  short && styles.eyebrowTextShort,
                  { textAlign: contentTextAlign, writingDirection: textDirection },
                ]}
              >
                {t('welcome.eyebrow')}
              </AppText>
            </View>

            {/* Main Headline */}
            <AppText
              accessibilityRole="header"
              style={[
                styles.title,
                compact && styles.titleCompact,
                short && styles.titleShort,
                tiny && styles.titleTiny,
                { textAlign: contentTextAlign, writingDirection: textDirection },
              ]}
            >
              {t('welcome.title')}
            </AppText>

            {/* Supporting Description Beneath Headline */}
            <AppText
              style={[
                styles.subtitle,
                compact && styles.subtitleCompact,
                short && styles.subtitleShort,
                tiny && styles.subtitleTiny,
                { textAlign: contentTextAlign, writingDirection: textDirection },
              ]}
            >
              {t('welcome.subtitle')}
            </AppText>
          </Animated.View>

          {/* 3. BOTTOM ACTIONS & TRUST GROUP */}
          <Animated.View
            style={[
              styles.bottomGroup,
              compact && styles.bottomGroupCompact,
              short && styles.bottomGroupShort,
              { opacity: contentOpacity },
            ]}
          >
            {/* Account Action Buttons */}
            <AppUpdateIndicator variant="inline" />
            <View style={[styles.actions, compact && styles.actionsCompact, short && styles.actionsShort]}>
              {/* Primary Action: Create Account */}
              <TouchableOpacity
                accessibilityLabel={t('welcome.createAccount')}
                accessibilityRole="button"
                activeOpacity={0.86}
                onPress={() => navigateOnce('Register')}
                style={[styles.primaryButton, compact && styles.primaryButtonCompact, short && styles.primaryButtonShort]}
              >
                <AppText
                  style={[
                    styles.primaryText,
                    compact && styles.primaryTextCompact,
                    short && styles.primaryTextShort,
                    { writingDirection: textDirection },
                  ]}
                >
                  {t('welcome.createAccount')}
                </AppText>
                <View style={[styles.primaryIcon, compact && styles.primaryIconCompact, isRTL && styles.primaryIconRTL]}>
                  <Icon name="arrow-forward" size={17} color={colors.navy} />
                </View>
              </TouchableOpacity>

              {/* Secondary Action: Existing Account / Sign In */}
              <TouchableOpacity
                accessibilityLabel={t('welcome.signIn')}
                accessibilityRole="button"
                activeOpacity={0.82}
                onPress={() => navigateOnce('Login')}
                style={[styles.secondaryButton, compact && styles.secondaryButtonCompact, short && styles.secondaryButtonShort]}
              >
                <AppText
                  style={[
                    styles.secondaryText,
                    compact && styles.secondaryTextCompact,
                    short && styles.secondaryTextShort,
                    { writingDirection: textDirection },
                  ]}
                >
                  {t('welcome.signIn')}
                </AppText>
              </TouchableOpacity>
            </View>

            {/* Career Opportunities Banner */}
            <View style={[styles.careersGlowWrap, compact && styles.careersGlowWrapCompact, short && styles.careersGlowWrapShort]}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={careersCopy.opportunities_title + '. ' + careersCopy.apply}
                activeOpacity={0.88}
                onLayout={(event) => {
                  const layout = event.nativeEvent.layout;
                  setCareerWidth(Math.max(layout.width, 0));
                  setCareerHeight(Math.max(layout.height, 0));
                }}
                onPress={() => navigateOnce('Careers')}
                style={[
                  styles.careersButton,
                  stackCareers && styles.careersButtonStacked,
                  compact && styles.careersButtonCompact,
                  short && styles.careersButtonShort,
                ]}
              >
                {!reduceMotion && (
                  <>
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.careerGlowAura,
                        { transform: [{ translateX: careerGlowX }, { translateY: careerGlowY }] },
                      ]}
                    />
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.careerGlowHalo,
                        { transform: [{ translateX: careerGlowX }, { translateY: careerGlowY }] },
                      ]}
                    />
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.careerGlowDot,
                        { transform: [{ translateX: careerGlowX }, { translateY: careerGlowY }] },
                      ]}
                    />
                  </>
                )}
                <AppText
                  numberOfLines={stackCareers ? 2 : 1}
                  style={[
                    styles.careerTitle,
                    compact && styles.careerTitleCompact,
                    short && styles.careerTitleShort,
                    stackCareers && styles.careerTitleStacked,
                    { textAlign: contentTextAlign, writingDirection: textDirection },
                  ]}
                >
                  {careersCopy.opportunities_title}
                </AppText>
                <View style={[styles.careerApply, compact && styles.careerApplyCompact]}>
                  <AppText
                    style={[
                      styles.careerApplyText,
                      compact && styles.careerApplyTextCompact,
                      short && styles.careerApplyTextShort,
                      { writingDirection: textDirection },
                    ]}
                  >
                    {careersCopy.apply}
                  </AppText>
                </View>
              </TouchableOpacity>
            </View>

            {/* Security & Verification Trust Row */}
            <View style={[styles.trustRow, compact && styles.trustRowCompact, short && styles.trustRowShort]}>
              <Icon name="shield-checkmark" size={15} color="#8DB9F2" />
              <AppText
                style={[
                  styles.trustText,
                  compact && styles.trustTextCompact,
                  short && styles.trustTextShort,
                  { writingDirection: textDirection },
                ]}
              >
                {t('welcome.trust')}
              </AppText>
            </View>
          </Animated.View>
        </ScrollView>
      </View>


    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    direction: 'ltr',
    backgroundColor: colors.navy,
    flex: 1,
    overflow: 'hidden',
    paddingHorizontal: 22,
  },
  safeAreaCompact: {
    paddingHorizontal: 18,
  },
  watermark: {
    height: 420,
    opacity: 0.05,
    position: 'absolute',
    right: -140,
    top: 90,
    transform: [{ rotate: '-9deg' }],
    width: 420,
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
  body: {
    flex: 1,
  },
  bodyScrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingBottom: 18,
  },
  bodyScrollContentCompact: {
    paddingTop: 4,
    paddingBottom: 14,
  },
  bodyScrollContentShort: {
    paddingTop: 2,
    paddingBottom: 10,
  },
  bodyScrollContentTiny: {
    paddingTop: 0,
    paddingBottom: 6,
  },

  // 1. Header Group
  headerGroup: {
    width: '100%',
  },
  headerGroupCompact: {},
  top: {
    direction: 'ltr',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 2,
  },
  topCompact: {
    paddingTop: 2,
  },
  exploreButton: {
    flexShrink: 1,
    maxWidth: '48%',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  exploreButtonCompact: {
    gap: 4,
    paddingVertical: 4,
  },
  exploreText: {
    flexShrink: 1,
    color: '#DDEBFF',
    fontFamily: typography.semibold,
    fontSize: 13,
    lineHeight: 18,
  },
  exploreTextCompact: {
    fontSize: 12,
    lineHeight: 16,
  },

  // Listed-properties hint banner with arrow
  exploreHintWrap: {
    direction: 'ltr',
    alignItems: 'flex-end',
    marginTop: 2,
    marginBottom: 8,
    paddingRight: 6,
  },
  exploreHintWrapCompact: {
    marginTop: 1,
    marginBottom: 6,
    paddingRight: 4,
  },
  exploreHintWrapRTL: {
    alignItems: 'flex-start',
    paddingRight: 0,
    paddingLeft: 6,
  },
  exploreArrow: {
    borderBottomColor: colors.gold,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderLeftWidth: 7,
    borderRightColor: 'transparent',
    borderRightWidth: 7,
    height: 0,
    marginRight: 16,
    width: 0,
  },
  exploreArrowCompact: {
    borderBottomWidth: 7,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    marginRight: 12,
  },
  exploreHint: {
    direction: 'ltr',
    maxWidth: '100%',
    alignItems: 'center',
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5.5,
    ...shadows.soft,
  },
  exploreHintCompact: {
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  exploreHintText: {
    flexShrink: 1,
    color: colors.navy,
    fontFamily: typography.bold,
    fontSize: 11.5,
    lineHeight: 16,
  },
  exploreHintTextCompact: {
    fontSize: 10.5,
    lineHeight: 14,
  },

  // Language selector container
  languageRow: {
    width: '100%',
    marginTop: 2,
    marginBottom: 14,
  },
  languageRowCompact: {
    marginTop: 2,
    marginBottom: 10,
  },
  languageRowShort: {
    marginTop: 0,
    marginBottom: 8,
  },

  // 2. Middle Hero Group (Left-Aligned Corporate Editorial)
  heroGroup: {
    width: '100%',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  heroGroupCompact: {
    paddingVertical: 4,
  },
  heroGroupShort: {
    paddingVertical: 2,
  },
  eyebrow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  eyebrowRTL: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  eyebrowDot: {
    backgroundColor: colors.gold,
    borderRadius: 4,
    height: 7,
    marginEnd: 8,
    width: 7,
  },
  eyebrowText: {
    color: '#A9C9F7',
    fontFamily: typography.bold,
    fontSize: 11,
    letterSpacing: 1.1,
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  eyebrowTextCompact: {
    fontSize: 10,
    letterSpacing: 0.9,
    lineHeight: 14,
  },
  eyebrowTextShort: {
    fontSize: 9.5,
    letterSpacing: 0.8,
  },
  title: {
    width: '100%',
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 32,
    letterSpacing: -0.7,
    lineHeight: 38,
  },
  titleCompact: {
    fontSize: 27,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  titleShort: {
    fontSize: 24,
    lineHeight: 28,
  },
  titleTiny: {
    fontSize: 21,
    lineHeight: 25,
  },
  subtitle: {
    width: '100%',
    maxWidth: 360,
    color: '#B7C8E2',
    fontFamily: typography.regular,
    fontSize: 14.5,
    lineHeight: 21,
    marginTop: 10,
  },
  subtitleCompact: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
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

  // 3. Bottom Actions & Trust Group
  bottomGroup: {
    width: '100%',
    paddingTop: 8,
  },
  bottomGroupCompact: {
    paddingTop: 4,
  },
  bottomGroupShort: {
    paddingTop: 2,
  },
  actions: {
    gap: 10,
    marginTop: 8,
  },
  actionsCompact: {
    gap: 8,
    marginTop: 6,
  },
  actionsShort: {
    gap: 6,
    marginTop: 4,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    flexDirection: 'row',
    minHeight: 54,
    justifyContent: 'center',
    paddingHorizontal: 48,
    paddingVertical: 10,
    position: 'relative',
    ...shadows.soft,
  },
  primaryButtonCompact: {
    minHeight: 48,
    paddingHorizontal: 42,
    paddingVertical: 8,
  },
  primaryButtonShort: {
    minHeight: 44,
    paddingHorizontal: 38,
  },
  primaryText: {
    color: colors.navy,
    fontFamily: typography.bold,
    fontSize: 15.5,
    lineHeight: 20,
    textAlign: 'center',
  },
  primaryTextCompact: {
    fontSize: 14,
    lineHeight: 18,
  },
  primaryTextShort: {
    fontSize: 13,
    lineHeight: 17,
  },
  primaryIcon: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: [{ translateY: -17 }],
    alignItems: 'center',
    backgroundColor: colors.gold,
    borderRadius: 17,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  primaryIconCompact: {
    right: 7,
    transform: [{ translateY: -15 }],
    borderRadius: 15,
    height: 30,
    width: 30,
  },
  primaryIconRTL: {
    right: undefined,
    left: 8,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 50,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  secondaryButtonCompact: {
    minHeight: 46,
    paddingVertical: 8,
  },
  secondaryButtonShort: {
    minHeight: 42,
    paddingVertical: 6,
  },
  secondaryText: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: 14.5,
    lineHeight: 20,
    textAlign: 'center',
  },
  secondaryTextCompact: {
    fontSize: 13.5,
    lineHeight: 18,
  },
  secondaryTextShort: {
    fontSize: 12.5,
    lineHeight: 16,
  },

  // Career Opportunities
  careersGlowWrap: {
    marginTop: 10,
  },
  careersGlowWrapCompact: {
    marginTop: 8,
  },
  careersGlowWrapShort: {
    marginTop: 6,
  },
  careersButton: {
    alignItems: 'center',
    backgroundColor: '#0D2A63',
    borderColor: 'rgba(127,227,255,0.36)',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  careersButtonStacked: {
    flexDirection: 'column',
    gap: 4,
    minHeight: 64,
  },
  careersButtonCompact: {
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  careersButtonShort: {
    minHeight: 42,
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
    fontSize: 13.5,
    lineHeight: 18,
    flex: 1,
    minWidth: 0,
    marginEnd: 8,
  },
  careerTitleCompact: {
    fontSize: 12.5,
    lineHeight: 16,
  },
  careerTitleShort: {
    fontSize: 11.5,
    lineHeight: 15,
  },
  careerTitleStacked: {
    flex: 0,
    width: '100%',
    marginEnd: 0,
  },
  careerApply: {
    backgroundColor: 'rgba(34,112,207,0.35)',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4.5,
    flexShrink: 0,
  },
  careerApplyCompact: {
    paddingHorizontal: 10,
    paddingVertical: 3.5,
  },
  careerApplyText: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  careerApplyTextCompact: {
    fontSize: 11,
    lineHeight: 14,
  },
  careerApplyTextShort: {
    fontSize: 10,
    lineHeight: 13,
  },

  // Security & Trust indicator
  trustRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 2,
  },
  trustRowCompact: {
    marginTop: 8,
    marginBottom: 0,
  },
  trustRowShort: {
    marginTop: 6,
  },
  trustText: {
    flexShrink: 1,
    color: '#8FA8CA',
    fontFamily: typography.medium,
    fontSize: 11.5,
    lineHeight: 16,
    marginStart: 6,
  },
  trustTextCompact: {
    fontSize: 10.5,
    lineHeight: 14,
  },
  trustTextShort: {
    fontSize: 10,
    lineHeight: 13,
  },
});

export default WelcomeScreen;
