import React, { useEffect, useRef } from 'react';
import {Animated,
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
import { colors, radius, shadows, typography } from '../../theme';
import AppText from '../../components/common/AppText';

const logo = require('../../../assets/rentalhub-app-icon.png');

const WelcomeScreen = ({ navigation }) => {
  const { height, width } = useWindowDimensions();
  const compact = height < 720 || width < 360;
  const contentY = useRef(new Animated.Value(22)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.navy} />
      <Image source={logo} style={styles.watermark} resizeMode="contain" />
      <View style={styles.orbTop} />
      <View style={styles.orbBottom} />

      <View style={styles.top}>
        <BrandMark light compact />
        <TouchableOpacity
          accessibilityLabel="Explore homes without signing in"
          accessibilityRole="button"
          onPress={() => navigation.navigate('Home')}
          style={styles.exploreButton}>
          <AppText style={styles.exploreText}>Explore homes</AppText>
          <Icon name="arrow-forward" size={17} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={[styles.bodyContent, compact && styles.bodyContentCompact]}
        showsVerticalScrollIndicator={false}>
      <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentY }] }}>
        <View style={styles.eyebrow}>
          <View style={styles.eyebrowDot} />
          <AppText style={styles.eyebrowText}>VERIFIED RENTALS ACROSS NIGERIA</AppText>
        </View>
        <AppText accessibilityRole="header" style={[styles.title, compact && styles.titleCompact]}>Your next home,{'\n'}handled with care.</AppText>
        <AppText style={styles.subtitle}>
          Find trusted properties, manage your tenancy and move with confidence—all in one place.
        </AppText>

        <View style={styles.actions}>
          <TouchableOpacity
            accessibilityLabel="Create a RentalHub account"
            accessibilityRole="button"
            activeOpacity={0.86}
            onPress={() => navigation.navigate('Register')}
            style={styles.primaryButton}>
            <AppText style={styles.primaryText}>Create an account</AppText>
            <View style={styles.primaryIcon}>
              <Icon name="arrow-forward" size={19} color={colors.navy} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel="Sign in to your RentalHub account"
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={() => navigation.navigate('Login')}
            style={styles.secondaryButton}>
            <AppText style={styles.secondaryText}>I already have an account</AppText>
          </TouchableOpacity>
        </View>

        <View style={styles.trustRow}>
          <Icon name="shield-checkmark" size={17} color="#8DB9F2" />
          <AppText style={styles.trustText}>Secure identity and property verification</AppText>
        </View>
      </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
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
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  exploreButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    paddingVertical: 10,
  },
  exploreText: {
    color: '#DDEBFF',
    fontFamily: typography.semibold,
    fontSize: 13,
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
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 18,
  },
  eyebrowDot: {
    backgroundColor: colors.gold,
    borderRadius: 4,
    height: 7,
    marginRight: 9,
    width: 7,
  },
  eyebrowText: {
    color: '#A9C9F7',
    fontFamily: typography.bold,
    fontSize: 13,
    letterSpacing: 1.25,
  },
  title: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 36,
    letterSpacing: -1.25,
    lineHeight: 48,
  },
  titleCompact: {
    fontSize: 36,
    lineHeight: 40,
  },
  subtitle: {
    color: '#B7C8E2',
    fontFamily: typography.regular,
    fontSize: 16,
    lineHeight: 25,
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
    height: 58,
    justifyContent: 'space-between',
    paddingLeft: 20,
    paddingRight: 10,
    ...shadows.soft,
  },
  primaryText: {
    color: colors.navy,
    fontFamily: typography.bold,
    fontSize: 16,
  },
  primaryIcon: {
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
    height: 56,
    justifyContent: 'center',
  },
  secondaryText: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: 16,
  },
  trustRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 22,
  },
  trustText: {
    color: '#8FA8CA',
    fontFamily: typography.medium,
    fontSize: 13,
    marginLeft: 7,
  },
});

export default WelcomeScreen;
