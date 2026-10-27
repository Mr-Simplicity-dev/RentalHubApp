import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import TextInput from './AppTextInput';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, radius, typography, typeScale } from '../../theme';

import AppText from '../../components/common/AppText';
const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  error,
  icon,
  multiline,
  numberOfLines,
  containerStyle,
  ...rest
}) => {
  useInterfaceLanguage();
  const [focused, setFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <AppText style={styles.label}>{label}</AppText>}
      <View
        style={[
          styles.inputContainer,
          focused && styles.inputFocused,
          error && styles.inputError,
        ]}>
        {icon && (
          <Icon
            name={icon}
            size={20}
            color={focused ? colors.blue : colors.muted}
            style={styles.icon}
          />
        )}
        <TextInput
          accessibilityLabel={rest.accessibilityLabel || label || placeholder}
          accessibilityState={{ disabled: Boolean(rest.editable === false) }}
          style={[styles.input, icon && styles.inputWithIcon, multiline && styles.multiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          secureTextEntry={secureTextEntry && !passwordVisible}
          keyboardType={keyboardType}
          placeholderTextColor="#6B7890"
          multiline={multiline}
          numberOfLines={numberOfLines}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          selectionColor={colors.blue}
          {...rest}
        />
        {secureTextEntry ? (
          <TouchableOpacity
            accessibilityLabel={passwordVisible ? ui("Hide password") : ui("Show password")}
            onPress={() => setPasswordVisible((visible) => !visible)}
            style={styles.visibilityButton}>
            <Icon
              name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.muted}
            />
          </TouchableOpacity>
        ) : null}
      </View>
      {error && <AppText accessibilityLiveRegion="polite" style={styles.errorText}>{ui(error)}</AppText>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
  },
  label: {
    color: colors.text,
    fontFamily: typography.medium,
    fontSize: typeScale.sm,
    lineHeight: 20,
    marginBottom: 8,
  },
  inputContainer: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 54,
  },
  inputFocused: {
    borderColor: colors.blue,
    borderWidth: 1.5,
  },
  inputError: {
    borderColor: colors.danger,
  },
  icon: {
    marginLeft: 15,
  },
  input: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.regular,
    fontSize: typeScale.base,
    lineHeight: 24,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  inputWithIcon: {
    paddingLeft: 10,
  },
  visibilityButton: {
    padding: 14,
    paddingLeft: 4,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    color: colors.danger,
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 5,
  },
});

export default Input;
