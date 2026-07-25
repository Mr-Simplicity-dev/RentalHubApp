import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StatusBar, StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '../../theme';
import { useAccessibilityPreferences } from '../../hooks/useAccessibilityPreferences';
import BrandLogoMark from './BrandLogoMark';

const LOADING_TRACK_WIDTH = 210;
const DEFAULT_DURATION_MS = 8000;

const BrandSplash = ({ duration = DEFAULT_DURATION_MS, showProgressPercent = false }) => {
  const { reduceMotion, scaleFont } = useAccessibilityPreferences();
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const copyOpacity = useRef(new Animated.Value(0)).current;
  const copyTranslateY = useRef(new Animated.Value(12)).current;
  const loadingOpacity = useRef(new Animated.Value(0)).current;
  const loadingTranslateY = useRef(new Animated.Value(12)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const [progressPercent, setProgressPercent] = useState(0);

  useEffect(() => {
    const progressListener = showProgressPercent
      ? progress.addListener(({ value }) => {
          const nextPercent = Math.max(0, Math.min(100, Math.round(value * 100)));
          setProgressPercent(nextPercent);
        })
      : null;

    if (reduceMotion) {
      scale.setValue(1);
      opacity.setValue(1);
      copyOpacity.setValue(1);
      copyTranslateY.setValue(0);
      loadingOpacity.setValue(1);
      loadingTranslateY.setValue(0);
      progress.setValue(1);
      if (showProgressPercent) {
        setProgressPercent(100);
      }
      return () => {
        if (progressListener) {
          progress.removeListener(progressListener);
        }
      };
    }

    if (showProgressPercent) {
      setProgressPercent(0);
    }
    progress.setValue(0);
    scale.setValue(1);
    opacity.setValue(1);
    copyOpacity.setValue(0);
    copyTranslateY.setValue(12);
    loadingOpacity.setValue(0);
    loadingTranslateY.setValue(12);
    const introAnimation = Animated.parallel([
      Animated.sequence([
        Animated.delay(520),
        Animated.timing(scale, {
          toValue: 1.018,
          duration: 360,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 7,
          tension: 55,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(620),
        Animated.parallel([
          Animated.timing(copyOpacity, {
            toValue: 1,
            duration: 620,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(copyTranslateY, {
            toValue: 0,
            duration: 520,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(980),
        Animated.parallel([
          Animated.timing(loadingOpacity, {
            toValue: 1,
            duration: 520,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(loadingTranslateY, {
            toValue: 0,
            duration: 420,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.timing(progress, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    ]);

    introAnimation.start(({ finished }) => {
      if (finished && showProgressPercent) {
        setProgressPercent(100);
      }
    });

    return () => {
      if (progressListener) {
        progress.removeListener(progressListener);
      }
      progress.stopAnimation();
    };
  }, [
    copyOpacity,
    copyTranslateY,
    duration,
    loadingOpacity,
    loadingTranslateY,
    opacity,
    progress,
    reduceMotion,
    scale,
    showProgressPercent,
  ]);

  const fillWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, LOADING_TRACK_WIDTH],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.navy} />
      <View style={[styles.orb, styles.orbTop]} />
      <View style={[styles.orb, styles.orbBottom]} />
      <Animated.View style={[styles.brand, { opacity, transform: [{ scale }] }]}>
        <View style={styles.logoStage}>
          <View style={styles.logoGlow} />
          <BrandLogoMark size="lg" surface="gold" />
        </View>
        <Animated.View
          style={{
            alignItems: 'center',
            opacity: copyOpacity,
            transform: [{ translateY: copyTranslateY }],
          }}
        >
          <Text style={[styles.name, { fontSize: scaleFont(34) }]}>RentalHub</Text>
          <Text style={[styles.tagline, { fontSize: scaleFont(14) }]}>Trusted homes. Confident living.</Text>
        </Animated.View>
      </Animated.View>
      <Animated.View
        style={[
          styles.loadingPanel,
          {
            opacity: loadingOpacity,
            transform: [{ translateY: loadingTranslateY }],
          },
        ]}
      >
        <View style={[styles.loadingRow, !showProgressPercent && styles.loadingRowCentered]}>
          <Text style={[styles.loadingText, { fontSize: scaleFont(11) }]}>Loading mobile workspace</Text>
          {showProgressPercent ? (
            <Text style={[styles.loadingPercent, { fontSize: scaleFont(11) }]}>{progressPercent}%</Text>
          ) : null}
        </View>
        <View style={styles.loadingTrack}>
          <Animated.View
            style={[
              styles.loadingFill,
              {
                width: fillWidth,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.loadingGlint,
              {
                transform: [{ translateX: fillWidth }],
              },
            ]}
          />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  brand: {
    alignItems: 'center',
  },
  logoStage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlow: {
    backgroundColor: 'rgba(255, 201, 40, 0.16)',
    borderRadius: 76,
    height: 152,
    position: 'absolute',
    width: 152,
  },
  name: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 36,
    letterSpacing: -1.25,
    marginTop: 20,
  },
  tagline: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontFamily: typography.medium,
    fontSize: 14,
    letterSpacing: 0,
    marginTop: 8,
  },
  loadingPanel: {
    bottom: 54,
    position: 'absolute',
    width: LOADING_TRACK_WIDTH,
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 9,
  },
  loadingRowCentered: {
    justifyContent: 'center',
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: typography.medium,
    fontSize: 13,
    letterSpacing: 0,
  },
  loadingPercent: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 13,
  },
  loadingTrack: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    borderWidth: 1,
    height: 5,
    overflow: 'hidden',
    width: '100%',
  },
  loadingFill: {
    backgroundColor: colors.gold,
    borderRadius: 4,
    height: 5,
  },
  loadingGlint: {
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    borderRadius: 4,
    height: 5,
    left: -10,
    position: 'absolute',
    top: 0,
    width: 18,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbTop: {
    backgroundColor: 'rgba(47, 128, 237, 0.22)',
    height: 260,
    right: -120,
    top: -80,
    width: 260,
  },
  orbBottom: {
    backgroundColor: 'rgba(255, 201, 40, 0.14)',
    bottom: -140,
    height: 320,
    left: -150,
    width: 320,
  },
});

export default BrandSplash;
