import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { colors } from '../../theme';

const logo = require('../../../assets/rentalhub-app-icon.png');

const sizeMap = {
  sm: { shell: 46, logo: 38, shellRadius: 14, logoRadius: 11 },
  md: { shell: 72, logo: 62, shellRadius: 20, logoRadius: 16 },
  lg: { shell: 126, logo: 112, shellRadius: 34, logoRadius: 28 },
};

const resolveSize = (size) => {
  if (typeof size === 'number') {
    return {
      shell: size,
      logo: Math.round(size * 0.89),
      shellRadius: Math.round(size * 0.27),
      logoRadius: Math.round(size * 0.22),
    };
  }

  return sizeMap[size] || sizeMap.md;
};

const BrandLogoMark = ({ size = 'md', surface = 'dark', style }) => {
  const dimensions = resolveSize(size);
  const isLightSurface = surface === 'light';
  const isGoldSurface = surface === 'gold';

  return (
    <View
      style={[
        styles.shell,
        isGoldSurface ? styles.shellGold : isLightSurface ? styles.shellLight : styles.shellDark,
        {
          borderRadius: dimensions.shellRadius,
          height: dimensions.shell,
          width: dimensions.shell,
        },
        style,
      ]}>
      <Image
        source={logo}
        style={[
          styles.logo,
          {
            borderRadius: dimensions.logoRadius,
            height: dimensions.logo,
            width: dimensions.logo,
          },
        ]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  shell: {
    alignItems: 'center',
    borderWidth: 1,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.24,
    shadowRadius: 28,
    elevation: 8,
  },
  shellDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  shellLight: {
    backgroundColor: colors.white,
    borderColor: '#E7EDF7',
    shadowColor: colors.navy,
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4,
  },
  shellGold: {
    backgroundColor: 'rgba(255, 201, 40, 0.28)',
    borderColor: 'rgba(255, 224, 138, 0.8)',
    shadowColor: colors.gold,
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 10,
  },
  logo: {
    backgroundColor: colors.white,
  },
});

export default BrandLogoMark;
