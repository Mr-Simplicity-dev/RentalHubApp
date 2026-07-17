import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StatusBar, StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '../../theme';
import { useAccessibilityPreferences } from '../../hooks/useAccessibilityPreferences';
import BrandLogoMark from './BrandLogoMark';

const LOADING_TRACK_WIDTH = 210;
const DEFAULT_DURATION_MS = 6500;

const BrandSplash = ({ duration = DEFAULT_DURATION_MS, showProgressPercent = false }) => {
  const { reduceMotion, scaleFont } = useAccessibilityPreferences();
  const scale = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;
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
    const introAnimation = Animated.parallel([
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
  }, [duration, opacity, progress, reduceMotion, scale, showProgressPercent]);

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
        <BrandLogoMark size="lg" surface="dark" />
        <Text style={[styles.name, { fontSize: scaleFont(34) }]}>RentalHub</Text>
        <Text style={[styles.tagline, { fontSize: scaleFont(14) }]}>Trusted homes. Confident living.</Text>
      </Animated.View>
      <View style={styles.loadingPanel}>
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
        </View>
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
    fontSize: 11,
    letterSpacing: 0.2,
  },
  loadingPercent: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 11,
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
