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
  const linkCalls = [];
  const state = { ready: true, routeNames: ['PropertyDetail', 'Messages', 'Notifications'] };
  const navigationRef = {
    isReady: () => state.ready,
    getRootState: () => ({ routeNames: state.routeNames }),
    navigate: (name, params) => calls.push({ name, params }),
  };
  vm.runInNewContext(compile('src/navigation/navigationRef.js'), {
    module,
    exports: module.exports,
    URL,
    URLSearchParams,
    require: (name) => {
      if (name === '@react-navigation/native') return { createNavigationContainerRef: () => navigationRef };
      if (name === 'react-native') return { Linking: { openURL: async (url) => linkCalls.push(url) } };
      throw new Error(`Unexpected module: ${name}`);
    },
  });
  return { ...module.exports, calls, linkCalls, state };
};

test('a property link from a notification opens the native detail screen with the property id', () => {
  const navigation = loadNavigationRef();
  assert.equal(navigation.openRentalHubLinkInApp('/properties/42'), true);
  assert.equal(JSON.stringify(navigation.calls), JSON.stringify([{ name: 'PropertyDetail', params: { id: '42' } }]));
});

test('push and in-app notification taps use the shared destination handler', () => {
  const context = fs.readFileSync(path.join(__dirname, '..', 'src/context/NotificationContext.js'), 'utf8');
  const screen = fs.readFileSync(path.join(__dirname, '..', 'src/screens/dashboard/NotificationsScreen.js'), 'utf8');
  assert.match(context, /openNotificationDestination\(data\)/);
  assert.match(context, /openNotificationLink\(data\.link\)/);
  assert.match(screen, /openNotificationLink\(link\)/);
  assert.match(screen, /onPress=\{\(\) => handleOpen\(item\)\}/);
});

test('unmapped RentalHub notifications open the safe website destination, not arbitrary websites', async () => {
  const navigation = loadNavigationRef();
  assert.equal(await navigation.openNotificationLink('/account/update'), true);
  assert.deepEqual(navigation.linkCalls, ['https://rentalhub.com.ng/account/update']);
  assert.equal(await navigation.openNotificationLink('https://example.com/account/update'), false);
  assert.equal(await navigation.openNotificationLink('//example.com/account/update'), false);
  assert.deepEqual(navigation.linkCalls, ['https://rentalhub.com.ng/account/update']);
});

test('staff identity notification links open the role-protected management or personal entry', () => {
  const navigation = loadNavigationRef();
  navigation.state.routeNames = ['MyStaffIdentity', 'StaffIdentityManagement'];
  assert.equal(navigation.openRentalHubLinkInApp('/my-staff-identity'), true);
  assert.equal(navigation.calls[0].name, 'MyStaffIdentity');
  assert.equal(navigation.openRentalHubLinkInApp('/super-admin?tab=staff_identity'), true);
  assert.equal(navigation.calls[1].name, 'StaffIdentityManagement');
  navigation.state.routeNames = ['Notifications'];
  assert.equal(navigation.openRentalHubLinkInApp('/staff-identity-management'), false);
});

test('admin notifications open the specific mobile verification or appeal screen', () => {
  const navigation = loadNavigationRef();
  navigation.state.routeNames = ['AdminVerifications', 'AdminAppeals', 'SuperAdminDashboard'];
  assert.equal(navigation.openRentalHubLinkInApp('/super-admin?tab=verifications'), true);
  assert.deepEqual(navigation.calls[0], { name: 'AdminVerifications', params: undefined });
  assert.equal(navigation.openRentalHubLinkInApp('/admin/appeals/84'), true);
  assert.equal(navigation.calls[1].name, 'AdminAppeals');
  assert.equal(navigation.calls[1].params.appealId, '84');
});
