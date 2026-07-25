import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '../../theme';
import BrandLogoMark from './BrandLogoMark';

const BrandMark = ({ light = false, compact = false, showName = true, style }) => (
  <View style={[styles.row, style]}>
    <BrandLogoMark size={compact ? 'sm' : 'md'} surface={light ? 'dark' : 'light'} />
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
  wordmark: {
    marginLeft: 14,
  },
  name: {
    color: colors.navy,
    fontFamily: typography.bold,
    fontSize: 24,
    letterSpacing: -1.25,
  },
  nameCompact: {
    fontSize: 20,
  },
  country: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 13,
    letterSpacing: 1.25,
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
