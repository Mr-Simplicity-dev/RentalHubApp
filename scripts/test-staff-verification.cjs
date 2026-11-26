const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('WelcomeScreen places underlined "Verify Staff Before Engaging Them" link directly beneath LanguageDropdown and navigates natively', () => {
  const src = read('src/screens/auth/WelcomeScreen.js');
  const langIdx = src.indexOf('<LanguageDropdown');
  const linkIdx = src.indexOf('Verify Staff Before Engaging Them');
  const heroIdx = src.indexOf('MIDDLE HERO GROUP');

  assert.ok(langIdx > -1, 'LanguageDropdown must remain present');
  assert.ok(linkIdx > langIdx, 'Verify Staff link must appear after LanguageDropdown');
  assert.ok(linkIdx < heroIdx, 'Verify Staff link must appear directly beneath LanguageDropdown and above hero group');
  assert.match(src, /onPress=\{\(\) => navigateOnce\('VerifyStaff'\)\}/, 'Must navigate natively to VerifyStaff');
  assert.match(src, /textDecorationLine:\s*['"]underline['"]/, 'Link text must be visually underlined');

  // Must NOT open external browser or WebView
  assert.doesNotMatch(src, /Linking\.openURL\([^)]*verify-staff/i);
  assert.doesNotMatch(src, /WebBrowser|WebView/);
});

test('AppNavigator registers native VerifyStaff and MyStaffIdentity routes for guests and authenticated staff', () => {
  const src = read('src/navigation/AppNavigator.js');
  assert.match(src, /import VerifyStaffScreen from '\.\.\/screens\/shared\/VerifyStaffScreen'/);
  assert.match(src, /import StaffIdentityManagementScreen, \{ StaffIdentityEntryScreen \} from '\.\.\/screens\/admin\/StaffIdentityManagementScreen'/);
  assert.match(src, /VerifyStaff:\s*'verify-staff'/);
  assert.match(src, /MyStaffIdentity:\s*'my-staff-identity'/);
  assert.match(src, /<Stack\.Screen name="VerifyStaff" component=\{VerifyStaffScreen\}/);
  assert.match(src, /<Stack\.Screen name="MyStaffIdentity" component=\{StaffIdentityEntryScreen\}/);
  assert.match(src, /<Stack\.Screen name="StaffIdentityManagement" component=\{StaffIdentityManagementScreen\}/);

  // Confirm commonInfoScreens is rendered inside GuestStack so unauthenticated visitors reach VerifyStaff natively
  const guestStart = src.indexOf('const GuestStack');
  const guestEnd = src.indexOf('const WebAdminRoot');
  const guestBlock = src.slice(guestStart, guestEnd);
  assert.ok(guestBlock.includes('{commonInfoScreens()}'), 'GuestStack must include commonInfoScreens');
});

test('VerifyStaffScreen is a full native implementation with all 9 states, payment safety notice, native QR camera, live confirmation, and reporting', () => {
  const src = read('src/screens/shared/VerifyStaffScreen.js');

  // Strict native-only checks
  assert.doesNotMatch(src, /WebView|react-native-webview|Linking\.openURL|WebBrowser/);

  // Native camera QR scanning with graceful permission request
  assert.match(src, /from 'expo-camera'/);
  assert.match(src, /useCameraPermissions/);
  assert.match(src, /<CameraView/);
  assert.match(src, /barcodeTypes:\s*\['qr'\]/);
  assert.match(src, /requestPermission\(/);
  assert.match(src, /Camera permission was not granted/);

  // Mandatory Payment Safety Notice
  assert.match(src, /IMPORTANT PAYMENT SAFETY NOTICE/);
  assert.match(src, /personal bank account/i);

  // All 9 authoritative verification states
  for (const state of [
    'ACTIVE_REGISTRATION',
    'LIVE_CONFIRMATION_SUCCESSFUL',
    'PENDING',
    'REJECTED',
    'EXPIRED',
    'SUSPENDED',
    'REVOKED',
    'EXPIRED_STAFF_REGISTRATION',
    'NOT_FOUND',
  ]) {
    assert.ok(src.includes(state), `Missing verification state: ${state}`);
  }

  // Live confirmation & reporting
  assert.match(src, /createLiveChallenge/);
  assert.match(src, /pollLiveChallenge/);
  assert.match(src, /submitImpersonationReport/);
  assert.match(src, /Report Suspected Impersonation/);
});

test('MyStaffIdentityScreen supports official QR display, explicit Confirm/Reject, and native challenge scanning', () => {
  const src = read('src/screens/shared/MyStaffIdentityScreen.js');
  assert.match(src, /getMyStaffIdentity/);
  assert.match(src, /getMyPendingChallenges/);
  assert.match(src, /lookupMyChallenge/);
  assert.match(src, /respondToChallenge/);
  assert.match(src, /'confirm'/);
  assert.match(src, /'reject'/);
  assert.match(src, /<CameraView/);
  assert.match(src, /barcodeTypes:\s*\['qr'\]/);
});

test('Mobile staff retain personal identity while Super Admin opens management', () => {
  for (const rel of [
    'src/components/admin/AdminAccountActions.js',
    'src/screens/agent/AgentDashboardScreen.js',
    'src/screens/shared/MarketingAgentScreen.js',
    'src/screens/shared/ZonalAdminScreen.js',
  ]) {
    const src = read(rel);
    assert.ok(src.includes('MyStaffIdentity'), `${rel} must link to MyStaffIdentity`);
  }
  const superAdmin = read('src/screens/admin/SuperAdminDashboardScreen.js');
  assert.ok(superAdmin.includes("route: 'StaffIdentityManagement'"));
  assert.ok(!superAdmin.includes("route: 'MyStaffIdentity'"));
});
