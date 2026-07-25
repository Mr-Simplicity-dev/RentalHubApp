import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors, typography, typeScale, letterSpacing, lineHeight as lh } from '../../theme';

const variantConfig = {
  h1:       { size: typeScale.hero,  family: typography.bold,     ls: letterSpacing.tight, lh: 42 },
  h2:       { size: typeScale.xxl,   family: typography.bold,     ls: letterSpacing.snug,  lh: 39 },
  h3:       { size: typeScale.xl,    family: typography.bold,     ls: letterSpacing.snug,  lh: 30 },
  h4:       { size: typeScale.lg,    family: typography.semibold, ls: letterSpacing.normal, lh: 26 },
  body:     { size: typeScale.base,  family: typography.regular,  ls: letterSpacing.normal, lh: 22 },
  bodySm:   { size: typeScale.sm,    family: typography.regular,  ls: letterSpacing.normal, lh: 20 },
  caption:  { size: typeScale.xs,    family: typography.medium,   ls: letterSpacing.wide,   lh: 16 },
  label:    { size: typeScale.sm,    family: typography.semibold, ls: letterSpacing.normal, lh: 18 },
  button:   { size: typeScale.base,  family: typography.semibold, ls: letterSpacing.wide,   lh: 20 },
  eyebrow:  { size: typeScale.xs,    family: typography.bold,     ls: letterSpacing.wider,  lh: 14 },
};

const AppText = ({ variant = 'body', style, color, align, children, ...props }) => {
  const cfg = variantConfig[variant] || variantConfig.body;

  return (
    <Text
      style={[
        {
          fontFamily: cfg.family,
          fontSize: cfg.size,
          letterSpacing: cfg.ls,
          lineHeight: cfg.lh,
          color: color || colors.text,
          textAlign: align || 'left',
        },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
};

export default AppText;