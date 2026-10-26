import React, { forwardRef } from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { colors, resolveTextStyle } from '../../theme';

const AppTextInput = forwardRef(({ style, placeholderTextColor = colors.muted, ...props }, ref) => (
  <TextInput
    {...props}
    ref={ref}
    placeholderTextColor={placeholderTextColor}
    style={resolveTextStyle({...StyleSheet.flatten(style),fontSize:Math.max(16,Number(StyleSheet.flatten(style)?.fontSize) || 16)})}
  />
));

AppTextInput.displayName = 'AppTextInput';

export default AppTextInput;
