import React from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, radius, typography } from '../../theme';

import AppText from '../../components/common/AppText';
const SelectField = ({
  label,
  value,
  placeholder = 'Select an option',
  onPress,
  disabled = false,
  helperText,
}) => (
  <View style={styles.container}>
    {label ? <AppText style={styles.label}>{label}</AppText> : null}
    <TouchableOpacity
      style={[styles.field, disabled && styles.fieldDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <AppText style={[styles.value, !value && styles.placeholder]}>
        {value || placeholder}
      </AppText>
      <Icon
        name="chevron-down-outline"
        size={20}
        color={disabled ? '#AAB3C3' : colors.muted}
      />
    </TouchableOpacity>
    {helperText ? <AppText style={styles.helperText}>{helperText}</AppText> : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
  },
  label: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 14,
    marginBottom: 8,
  },
  field: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: 52,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  fieldDisabled: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  value: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.regular,
    fontSize: 16,
    marginRight: 10,
  },
  placeholder: {
    color: '#96A2B8',
  },
  helperText: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 5,
  },
});

export default SelectField;
