import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, radius, typography } from '../../theme';

import AppText from '../../components/common/AppText';
const Button = ({
  title,
  onPress,
  loading = false,
  variant = 'primary',
  size = 'md',
  style,
  textStyle,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const buttonStyle = [
    styles.button,
    variant === 'primary' && styles.primaryButton,
    variant === 'secondary' && styles.secondaryButton,
    variant === 'outline' && styles.outlineButton,
    variant === 'danger' && styles.dangerButton,
    size === 'sm' && styles.smallButton,
    size === 'lg' && styles.largeButton,
    disabled && styles.disabledButton,
    style,
  ];

  const computedTextStyle = [
    styles.text,
    variant === 'primary' && styles.primaryText,
    variant === 'secondary' && styles.secondaryText,
    variant === 'outline' && styles.outlineText,
    variant === 'danger' && styles.dangerText,
    size === 'sm' && styles.smallText,
    size === 'lg' && styles.largeText,
    textStyle,
  ];

  return (
    <TouchableOpacity
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: disabled || loading }}
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.84}>
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? colors.blue : colors.white} />
      ) : (
        <AppText style={computedTextStyle}>{title}</AppText>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  primaryButton: {
    backgroundColor: colors.blue,
  },
  secondaryButton: {
    backgroundColor: colors.surfaceBlue,
  },
  outlineButton: {
    backgroundColor: colors.white,
    borderColor: colors.blue,
    borderWidth: 1,
  },
  dangerButton: {
    backgroundColor: colors.danger,
  },
  disabledButton: {
    opacity: 0.48,
  },
  text: {
    fontFamily: typography.semibold,
    fontSize: 16,
  },
  primaryText: {
    color: colors.white,
  },
  secondaryText: {
    color: colors.ink,
  },
  outlineText: {
    color: colors.blue,
  },
  dangerText: {
    color: colors.white,
  },
  smallButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  largeButton: {
    minHeight: 56,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  smallText: {
    fontSize: 14,
  },
  largeText: {
    fontSize: 18,
  },
});

export default Button;
