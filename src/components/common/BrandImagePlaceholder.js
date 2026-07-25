import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import BrandLogoMark from '../brand/BrandLogoMark';
import { colors, typography } from '../../theme';

const BrandImagePlaceholder = ({
  compact = false,
  style,
  title = 'RentalHub verified home',
}) => (
  <View style={[styles.container, style]}>
    <View style={[styles.orb, styles.orbTop]} />
    <View style={[styles.orb, styles.orbBottom]} />
    <BrandLogoMark size={compact ? 'sm' : 'md'} surface="dark" />
    {!compact ? <Text style={styles.title}>{title}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  title: {
    color: 'rgba(255, 255, 255, 0.74)',
    fontFamily: typography.semibold,
    fontSize: 13,
    letterSpacing: 0.2,
    marginTop: 12,
  },
  orb: {
    borderRadius: 999,
    position: 'absolute',
  },
  orbTop: {
    backgroundColor: 'rgba(47, 128, 237, 0.24)',
    height: 150,
    right: -48,
    top: -62,
    width: 150,
  },
  orbBottom: {
    backgroundColor: 'rgba(255, 201, 40, 0.16)',
    bottom: -70,
    height: 170,
    left: -70,
    width: 170,
  },
});

export default BrandImagePlaceholder;
