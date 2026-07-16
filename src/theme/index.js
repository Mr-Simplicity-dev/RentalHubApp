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
