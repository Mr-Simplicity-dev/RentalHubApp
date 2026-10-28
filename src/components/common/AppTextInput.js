import React, { forwardRef } from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { applyResponsiveTextStyle, colors, resolveTextStyle } from '../../theme';
import { useTypography } from '../../context/TypographyContext';

const AppTextInput = forwardRef(({ style, placeholderTextColor = colors.muted, ...props }, ref) => {
  const metrics = useTypography();
  const flatStyle = StyleSheet.flatten(style) || {};
  const inputStyle = applyResponsiveTextStyle(
    resolveTextStyle({
      ...flatStyle,
      minHeight: Math.max(44, Number(flatStyle.minHeight) || 0),
      fontSize: Math.max(16, Number(flatStyle.fontSize) || 16),
    }),
    metrics
  );

  return (
    <TextInput
      {...props}
      ref={ref}
      maxFontSizeMultiplier={metrics.maxFontSizeMultiplier}
      placeholderTextColor={placeholderTextColor}
      style={inputStyle}
    />
  );
});

AppTextInput.displayName = 'AppTextInput';

export default AppTextInput;
