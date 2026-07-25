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
  muted: '#71809D',
  border: '#DDE4EF',
  danger: '#D92D20',
  success: '#169B62',
  warning: '#F59E0B',
  info: '#06B6D4',
  purple: '#8B5CF6',
};

export const typography = {
  regular: Platform.select({ ios: 'Inter-Regular', android: 'Inter-Regular', default: 'Inter' }),
  medium: Platform.select({ ios: 'Inter-Medium', android: 'Inter-Medium', default: 'Inter' }),
  semibold: Platform.select({ ios: 'Inter-SemiBold', android: 'Inter-SemiBold', default: 'Inter' }),
  bold: Platform.select({ ios: 'Inter-Bold', android: 'Inter-Bold', default: 'Inter' }),
};

export const typeScale = {
  xs: 13,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 32,
  hero: 36,
};

export const letterSpacing = {
  tight: -1.25,
  snug: -0.5,
  normal: 0,
  wide: 0.5,
  wider: 1.25,
};

export const lineHeight = {
  none: 1,
  tight: 1.2,
  normal: 1.4,
  relaxed: 1.6,
};

// Maps fontWeight numbers to the correct Inter font family
export const fontWeightToFamily = (weight) => {
  if (weight >= 800) return typography.bold;
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
