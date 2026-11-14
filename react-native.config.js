module.exports = {
  project: {
    android: {
      sourceDir: './android',
      appName: 'app',
      manifestPath: 'app/src/main/AndroidManifest.xml',
    },
    ios: {
      sourceDir: './ios',
    },
  },
  assets: [
    './assets/fonts',
    './node_modules/react-native-vector-icons/Fonts',
  ],
  dependencies: {
    expo: {
      platforms: {
        android: null,
      },
    },
  },
};
