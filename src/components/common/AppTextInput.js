import React, { forwardRef } from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { colors, resolveTextStyle } from '../../theme';

const AppTextInput = forwardRef(({ style, placeholderTextColor = colors.muted, ...props }, ref) => (
  <TextInput
    {...props}
    ref={ref}
    placeholderTextColor={placeholderTextColor}
    style={resolveTextStyle(StyleSheet.flatten(style) || {})}
  />
));

AppTextInput.displayName = 'AppTextInput';

export default AppTextInput;
