import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { resolveTextStyle } from '../../theme';
import { formatDisplayValue } from '../../utils/display';

// Anything that is not a React element is rendered as text, so a stray object or
// array from an API payload shows a readable value instead of "[object Object]".
const normalizeChildren = (children) => {
  if (Array.isArray(children)) return children.map(normalizeChildren);
  if (children === null || children === undefined) return children;
  if (typeof children === 'object' && !React.isValidElement(children)) {
    return formatDisplayValue(children);
  }
  return children;
};

const AppText = ({ variant, style, color, align, children, ...props }) => {
  const flatStyle = StyleSheet.flatten(style) || {};
  const baseStyle = resolveTextStyle(flatStyle, variant);

  if (color) baseStyle.color = color;
  if (align) baseStyle.textAlign = align;

  return (
    <Text style={baseStyle} {...props}>
      {normalizeChildren(children)}
    </Text>
  );
};

export default AppText;
