import React, { useEffect, useRef } from 'react';
import { Animated, Image, StatusBar, StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '../../theme';
import { useAccessibilityPreferences } from '../../hooks/useAccessibilityPreferences';

const logo = require('../../../assets/rentalhub-app-icon.png');

const BrandSplash = () => {
  const { reduceMotion, scaleFont } = useAccessibilityPreferences();
  const scale = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      scale.setValue(1);
      opacity.setValue(1);
      return;
    }

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
    ]).start();
  }, [opacity, reduceMotion, scale]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.navy} />
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />
      <Animated.View style={[styles.brand, { opacity, transform: [{ scale }] }]}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.name, { fontSize: scaleFont(34) }]}>RentalHub</Text>
        <Text style={[styles.tagline, { fontSize: scaleFont(14) }]}>Trusted homes. Confident living.</Text>
      </Animated.View>
      <View style={styles.loadingTrack}>
        <Animated.View style={[styles.loadingFill, { opacity }]} />
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
  glowOne: {
    backgroundColor: colors.blue,
    borderRadius: 220,
    height: 360,
    opacity: 0.2,
    position: 'absolute',
    right: -180,
    top: -100,
    width: 360,
  },
  glowTwo: {
    backgroundColor: colors.blueBright,
    borderRadius: 180,
    bottom: -170,
    height: 320,
    left: -160,
    opacity: 0.13,
    position: 'absolute',
    width: 320,
  },
  brand: {
    alignItems: 'center',
  },
  logo: {
    borderRadius: 28,
    height: 112,
    width: 112,
  },
  name: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 34,
    letterSpacing: -1,
    marginTop: 20,
  },
  tagline: {
    color: '#B8C8E3',
    fontFamily: typography.medium,
    fontSize: 14,
    letterSpacing: 0.2,
    marginTop: 8,
  },
  loadingTrack: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 3,
    bottom: 64,
    height: 3,
    overflow: 'hidden',
    position: 'absolute',
    width: 72,
  },
  loadingFill: {
    backgroundColor: colors.gold,
    borderRadius: 3,
    height: 3,
    width: 48,
  },
});

export default BrandSplash;
