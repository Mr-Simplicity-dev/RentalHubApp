import React from 'react';
import {StyleSheet, View} from 'react-native';
import { colors, typography } from '../../theme';
import BrandLogoMark from './BrandLogoMark';

import AppText from '../../components/common/AppText';

// Amana is the house mark above the RentalHub wordmark. Deep burgundy taken from
// the flyer palette (#6e1b2b); the lighter tint keeps it legible on dark surfaces.
export const AMANA_RED = '#6e1b2b';
export const AMANA_RED_ON_DARK = '#a12a40';
export const AMANA_SCRIPT_FONT = 'AmanaScript';

const BrandMark = ({ light = false, compact = false, showName = true, style }) => (
  <View style={[styles.row, style]}>
    <BrandLogoMark size={compact ? 'sm' : 'md'} surface={light ? 'dark' : 'light'} />
    {showName ? (
      <View style={styles.wordmark}>
        <AppText
          style={[
            styles.amana,
            compact && styles.amanaCompact,
            light ? styles.amanaLight : null,
          ]}
        >
          Amana
        </AppText>
        <AppText style={[styles.name, compact && styles.nameCompact, light && styles.light]}>
          RentalHub
        </AppText>
        {!compact ? (
          <AppText style={[styles.country, light && styles.countryLight]}>NIGERIA</AppText>
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
  amana: {
    color: AMANA_RED,
    fontFamily: AMANA_SCRIPT_FONT,
    fontSize: 22,
    letterSpacing: 0.5,
    lineHeight: 28,
  },
  amanaCompact: {
    fontSize: 18,
    lineHeight: 22,
  },
  amanaLight: {
    color: AMANA_RED_ON_DARK,
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
