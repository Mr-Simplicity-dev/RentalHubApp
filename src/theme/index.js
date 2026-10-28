import { Platform } from 'react-native';

export const colors = {
  navy: '#071A3D',
  navySoft: '#102B5C',
  blue: '#1769E0',
  blueBright: '#2F80ED',
  sky: '#DCEEFF',
  gold: '#FFC928',
  white: '#FFFFFF',
  surface: '#F6F8FC',
  surfaceBlue: '#EEF5FF',
  ink: '#0E1C36',
  text: '#33415C',
  muted: '#586A86',
  border: '#DDE4EF',
  danger: '#D92D20',
  success: '#169B62',
  warning: '#F59E0B',
  info: '#06B6D4',
  purple: '#8B5CF6',
};

export const typography = {
  regular: Platform.select({ ios: 'Inter-Regular', android: 'Inter-Regular', default: 'Inter-Regular' }),
  medium: Platform.select({ ios: 'Inter-Medium', android: 'Inter-Medium', default: 'Inter-Medium' }),
  semibold: Platform.select({ ios: 'Inter-SemiBold', android: 'Inter-SemiBold', default: 'Inter-SemiBold' }),
  bold: Platform.select({ ios: 'Inter-Bold', android: 'Inter-Bold', default: 'Inter-Bold' }),
};

export const typeScale = {
  compact: 13,
  xs: 13,
  sm: 14,
  reading: 15,
  base: 16,
  md: 18,
  lg: 20,
  xl: 24,
  xxl: 28,
  hero: 32,
};

export const letterSpacing = {
  tight: -0.6,
  snug: -0.3,
  normal: 0,
  wide: 0.2,
  wider: 0.8,
};

export const lineHeight = {
  none: 1,
  tight: 1.2,
  normal: 1.4,
  relaxed: 1.6,
};

// Maps fontWeight numbers to the correct Inter font family
export const fontWeightToFamily = (weight) => {
  if (weight >= 700) return typography.bold;
  if (weight >= 600) return typography.semibold;
  if (weight >= 500) return typography.medium;
  return typography.regular;
};

export const shadows = {
  soft: Platform.select({
    ios: {
      shadowColor: '#071A3D',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 18,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const createTypographyMetrics = ({ width = 390, fontScale = 1, largerText = false } = {}) => {
  const viewportWidth = Number(width) > 0 ? Number(width) : 390;
  const systemFontScale = Number(fontScale) > 0 ? Number(fontScale) : 1;
  return {
    width: viewportWidth,
    systemFontScale,
    headingScale: clamp(viewportWidth / 390, 0.92, 1.06),
    textScale: largerText ? 1.12 : 1,
    maxFontSizeMultiplier: 1.3,
  };
};

export const applyResponsiveTextStyle = (style = {}, metrics = {}) => {
  const fontSize = Number(style.fontSize) || typeScale.base;
  const headingScale = Number(metrics.headingScale) > 0 ? Number(metrics.headingScale) : 1;
  const textScale = Number(metrics.textScale) > 0 ? Number(metrics.textScale) : 1;
  const scale = (fontSize >= 20 ? headingScale : 1) * textScale;
  if (Math.abs(scale - 1) < 0.001) return style;

  const nextFontSize = Math.max(typeScale.xs, Math.round(fontSize * scale));
  const currentLineHeight = Number(style.lineHeight) || Math.round(fontSize * (fontSize >= 24 ? 1.25 : 1.45));
  return {
    ...style,
    fontSize: nextFontSize,
    lineHeight: Math.max(Math.ceil(nextFontSize * 1.2), Math.round(currentLineHeight * scale)),
  };
};

export const textStyles = {
  h1: { fontSize: typeScale.hero, fontFamily: typography.semibold, letterSpacing: letterSpacing.tight, lineHeight: 40 },
  h2: { fontSize: typeScale.xxl, fontFamily: typography.semibold, letterSpacing: letterSpacing.snug, lineHeight: 36 },
  h3: { fontSize: typeScale.xl, fontFamily: typography.semibold, letterSpacing: letterSpacing.snug, lineHeight: 32 },
  h4: { fontSize: typeScale.lg, fontFamily: typography.semibold, letterSpacing: 0, lineHeight: 28 },
  body: { fontSize: typeScale.base, fontFamily: typography.regular, letterSpacing: 0, lineHeight: 24 },
  bodySm: { fontSize: typeScale.reading, fontFamily: typography.regular, letterSpacing: 0, lineHeight: 22 },
  caption: { fontSize: typeScale.xs, fontFamily: typography.regular, letterSpacing: 0, lineHeight: 18 },
  label: { fontSize: typeScale.sm, fontFamily: typography.medium, letterSpacing: 0, lineHeight: 20 },
  button: { fontSize: typeScale.base, fontFamily: typography.semibold, letterSpacing: 0, lineHeight: 22 },
  eyebrow: { fontSize: typeScale.compact, fontFamily: typography.semibold, letterSpacing: letterSpacing.wider, lineHeight: 18 },
};

export const resolveTextStyle = (style = {}, variant) => {
  const preset = textStyles[variant] || textStyles.body;
  const result = { color: colors.text, ...preset, ...style };
  if (style.fontSize != null && style.lineHeight == null) {
    result.lineHeight = Math.round(style.fontSize * (style.fontSize >= 24 ? 1.25 : 1.45));
  }
  result.fontSize=Math.max(typeScale.xs,Number(result.fontSize) || typeScale.base);
  result.lineHeight = Math.max(result.lineHeight, Math.ceil(result.fontSize * (result.fontSize>=24?1.25:1.45)));
  const isInter = !style.fontFamily || Object.values(typography).includes(style.fontFamily);
  if (isInter) {
    if (style.fontWeight != null) {
      const weight = style.fontWeight === 'bold' ? 700 : style.fontWeight === 'normal' ? 400 : Number(style.fontWeight);
      result.fontFamily = fontWeightToFamily(Number.isFinite(weight) ? weight : 400);
    }
    result.fontWeight = 'normal';
  }
  return result;
};
