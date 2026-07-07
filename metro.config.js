const { mergeConfig } = require('@react-native/metro-config');
const { getDefaultConfig } = require('expo/metro-config');

module.exports = mergeConfig(getDefaultConfig(__dirname), {
  resolver: {
    useWatchman: false,
  },
});
