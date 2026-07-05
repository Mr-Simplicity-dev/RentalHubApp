import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '../../theme';

const logo = require('../../../assets/rentalhub-app-icon.png');

const BrandMark = ({ light = false, compact = false, showName = true, style }) => (
  <View style={[styles.row, style]}>
    <Image source={logo} style={[styles.logo, compact && styles.logoCompact]} resizeMode="contain" />
    {showName ? (
      <View style={styles.wordmark}>
        <Text style={[styles.name, compact && styles.nameCompact, light && styles.light]}>
          RentalHub
        </Text>
        {!compact ? (
          <Text style={[styles.country, light && styles.countryLight]}>NIGERIA</Text>
        ) : null}
      </View>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 18,
  },
  logoCompact: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  wordmark: {
    marginLeft: 14,
  },
  name: {
    color: colors.navy,
    fontFamily: typography.bold,
    fontSize: 27,
    letterSpacing: -0.8,
  },
  nameCompact: {
    fontSize: 21,
  },
  country: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 10,
    letterSpacing: 3.4,
    marginTop: 2,
  },
  light: {
    color: colors.white,
  },
  countryLight: {
    color: '#9BCBFF',
  },
});

export default BrandMark;
