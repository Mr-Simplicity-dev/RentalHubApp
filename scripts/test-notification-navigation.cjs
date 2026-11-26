const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { transformSync } = require('@babel/core');

const compile = (file) => transformSync(
  fs.readFileSync(path.join(__dirname, '..', file), 'utf8'),
  { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }
).code;

const loadNavigationRef = () => {
  const module = { exports: {} };
  const calls = [];
  const state = { ready: true, routeNames: ['PropertyDetail', 'Messages', 'Notifications'] };
  const navigationRef = {
    isReady: () => state.ready,
    getRootState: () => ({ routeNames: state.routeNames }),
    navigate: (name, params) => calls.push({ name, params }),
  };
  vm.runInNewContext(compile('src/navigation/navigationRef.js'), {
    module,
    exports: module.exports,
    require: (name) => {
      if (name === '@react-navigation/native') return { createNavigationContainerRef: () => navigationRef };
      throw new Error(`Unexpected module: ${name}`);
    },
  });
  return { ...module.exports, calls, state };
};

test('a property link from a notification opens the native detail screen with the property id', () => {
  const navigation = loadNavigationRef();
  assert.equal(navigation.openRentalHubLinkInApp('/properties/42'), true);
  assert.equal(JSON.stringify(navigation.calls), JSON.stringify([{ name: 'PropertyDetail', params: { id: '42' } }]));
});

test('a push payload link and an in-app notification link use the same native destination', () => {
  const context = fs.readFileSync(path.join(__dirname, '..', 'src/context/NotificationContext.js'), 'utf8');
  const screen = fs.readFileSync(path.join(__dirname, '..', 'src/screens/dashboard/NotificationsScreen.js'), 'utf8');
  assert.match(context, /openNotificationDestination\(data\)/);
  assert.match(context, /openRentalHubLinkInApp\(data\.link\)/);
  assert.match(screen, /openRentalHubLinkInApp\(link\)/);
  assert.match(screen, /onPress=\{\(\) => handleOpen\(item\)\}/);
});

test('a notification link cannot open an arbitrary website in a browser', () => {
  const context = fs.readFileSync(path.join(__dirname, '..', 'src/context/NotificationContext.js'), 'utf8');
  assert.match(context, /isAllowedExternalLink/);
  assert.equal(context.includes('rentalhub\\.com\\.ng'), true);
  assert.match(context, /data\.link && isAllowedExternalLink\(data\.link\)[\s\S]*Linking\.openURL\(String\(data\.link\)\)/);
});
