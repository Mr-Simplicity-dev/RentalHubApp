import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StatusBar, StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '../../theme';
import { useAccessibilityPreferences } from '../../hooks/useAccessibilityPreferences';
import BrandLogoMark from './BrandLogoMark';

const LOADING_TRACK_WIDTH = 168;
const DEFAULT_DURATION_MS = 4800;

const BrandSplash = ({ duration = DEFAULT_DURATION_MS }) => {
  const { reduceMotion, scaleFont } = useAccessibilityPreferences();
  const scale = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      scale.setValue(1);
      opacity.setValue(1);
      progress.setValue(1);
      return;
    }

    progress.setValue(0);
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 55,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.timing(progress, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [duration, opacity, progress, reduceMotion, scale]);

  const fillTranslateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-LOADING_TRACK_WIDTH, 0],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.navy} />
      <View style={[styles.orb, styles.orbTop]} />
      <View style={[styles.orb, styles.orbBottom]} />
      <Animated.View style={[styles.brand, { opacity, transform: [{ scale }] }]}>
        <BrandLogoMark size="lg" surface="dark" />
        <Text style={[styles.name, { fontSize: scaleFont(34) }]}>RentalHub</Text>
        <Text style={[styles.tagline, { fontSize: scaleFont(14) }]}>Trusted homes. Confident living.</Text>
      </Animated.View>
      <View style={styles.loadingTrack}>
        <Animated.View
          style={[
            styles.loadingFill,
            {
              opacity,
              transform: [{ translateX: fillTranslateX }],
            },
          ]}
        />
      </View>
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
  name: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 34,
    letterSpacing: -1,
    marginTop: 20,
  },
  tagline: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontFamily: typography.medium,
    fontSize: 14,
    letterSpacing: 0.2,
    marginTop: 8,
  },
  loadingTrack: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    borderWidth: 1,
    bottom: 64,
    height: 5,
    overflow: 'hidden',
    position: 'absolute',
    width: LOADING_TRACK_WIDTH,
  },
  loadingFill: {
    backgroundColor: colors.gold,
    borderRadius: 4,
    height: 5,
    width: LOADING_TRACK_WIDTH,
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
