const { getDefaultConfig } = require('expo/metro-config');

// React Native's community CLI prints a "your Metro config should extend
// '@react-native/metro-config'" warning based on this global flag. Expo's
// getDefaultConfig uses its own Metro fork (@expo/metro/metro-config) instead,
// so the flag is never set and the CLI emits a false positive. Setting it here
// reflects that this config IS the framework default config.
global.__REACT_NATIVE_METRO_CONFIG_LOADED = true;

/**
 * Metro configuration for RentalHub Mobile.
 * https://docs.expo.dev/guides/customizing-metro/
 *
 * @type {import('expo/metro-config').MetroConfig}
 */
module.exports = getDefaultConfig(__dirname);
