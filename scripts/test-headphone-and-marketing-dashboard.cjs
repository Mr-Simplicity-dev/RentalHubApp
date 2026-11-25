'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('callDirectoryService fallback policy matches role matrix for mobile dashboards', () => {
  const src = read('src/services/callDirectoryService.js');
  // Strip ESM syntax just enough to evaluate inferFallbackCallPolicy safely in Node
  const fnMatch = src.match(/export const inferFallbackCallPolicy = (\([\s\S]*?\n\};)/);
  assert.ok(fnMatch, 'inferFallbackCallPolicy must be exported');
  // eslint-disable-next-line no-new-func
  const inferFallbackCallPolicy = new Function(`return ${fnMatch[1]}`)();

  const tenant = inferFallbackCallPolicy({ user_type: 'tenant' });
  assert.equal(tenant.mode, 'support_only');
  assert.equal(tenant.canChatSupport, true);
  assert.equal(tenant.canCallSupport, true);
  assert.equal(tenant.canCallBoss, false);

  const landlord = inferFallbackCallPolicy({ user_type: 'landlord' });
  assert.equal(landlord.mode, 'support_only');

  const agent = inferFallbackCallPolicy({ user_type: 'agent' });
  assert.equal(agent.mode, 'support_and_boss');
  assert.equal(agent.canCallBoss, true);
  assert.equal(agent.canCallSupport, true);

  const marketing = inferFallbackCallPolicy({ user_type: 'marketing_agent' });
  assert.equal(marketing.mode, 'support_and_boss');
  assert.equal(marketing.canCallBoss, true);

  const nationalAdmin = inferFallbackCallPolicy({ user_type: 'super_support_admin' });
  assert.equal(nationalAdmin.mode, 'admin_subordinates');
  assert.equal(nationalAdmin.canCallSubordinates, true);
  assert.equal(nationalAdmin.canCallAnyone, false);

  const superAdmin = inferFallbackCallPolicy({ user_type: 'super_admin' });
  assert.equal(superAdmin.mode, 'platform_all');
  assert.equal(superAdmin.canCallAnyone, true);
});

test('HeadphoneSupportButton supports Android RECORD_AUDIO permission and all role modes', () => {
  const src = read('src/components/calls/HeadphoneSupportButton.js');
  assert.match(src, /PermissionsAndroid\.PERMISSIONS\.RECORD_AUDIO/, 'Android mic permission must be requested');
  assert.match(src, /inviteSupportCall/, 'Must invoke inviteSupportCall for Support calls');
  assert.match(src, /inviteCall/, 'Must invoke inviteCall for Boss / Admin / Super Admin direct calls');
  assert.match(src, /Platform Call Directory/, 'Must render Platform Call Directory for Super Admin');
  assert.match(src, /Admin & Team Call Directory/, 'Must render Team Directory for National/Senior Admins');
  assert.match(src, /CALL YOUR BOSS \/ SUPERVISOR/, 'Must render Call Your Boss section for Agents & Marketing Agents');
  assert.match(src, /Chat with Support/, 'Must render Chat with Support action');
  assert.match(src, /Call Support/, 'Must render Call Support action');
});

test('MarketingAgentScreen and MarketingAgentRoot close all requested disparities without unrelated bloat', () => {
  const screen = read('src/screens/shared/MarketingAgentScreen.js');
  assert.match(screen, /<HeadphoneSupportButton/, 'Marketing Agent must have Headphone icon');
  assert.match(screen, /<NotificationBell/, 'Marketing Agent must have Notification Bell');
  assert.match(screen, /log-out-outline/, 'Marketing Agent must have Logout button');
  assert.match(screen, /navigation\.navigate\('PropertyList'\)/, 'Marketing Agent must link to Property Market');
  assert.match(screen, /navigation\.navigate\('Messages'\)/, 'Marketing Agent must link to Messages');
  assert.match(screen, /navigation\.navigate\('Profile'\)/, 'Marketing Agent must link to Profile');
  assert.match(screen, /navigation\.navigate\('PublicSurvey'/, 'Marketing Agent must link to Conduct Survey');
  assert.match(screen, /WalletWithdrawModal/, 'Marketing Agent must retain Commission Withdrawal modal');

  const nav = read('src/navigation/AppNavigator.js');
  const rootMatch = nav.match(/const MarketingAgentRoot = [\s\S]*?<\/Stack\.Navigator>/);
  assert.ok(rootMatch, 'MarketingAgentRoot must exist');
  const rootBlock = rootMatch[0];
  for (const route of ['PropertyList', 'PropertyDetail', 'Notifications', 'Messages', 'Support', 'Profile', 'PublicSurvey']) {
    assert.match(rootBlock, new RegExp(`name="${route}"`), `MarketingAgentRoot must register ${route}`);
  }
});

test('Headphone icon sits beside the Notification Bell across every dashboard header', () => {
  const hook = read('src/hooks/useAdminNotificationHeader.js');
  assert.match(hook, /<HeadphoneSupportButton/, 'Admin header hook must include HeadphoneSupportButton');
  assert.match(hook, /<NotificationBell/, 'Admin header hook must include NotificationBell');

  for (const file of [
    'src/screens/admin/SuperAdminDashboardScreen.js',
    'src/screens/dashboard/DashboardScreen.js',
    'src/screens/home/HomeScreen.js',
    'src/screens/dashboard/ProfileScreen.js',
  ]) {
    const content = read(file);
    assert.match(content, /<HeadphoneSupportButton/, `${file} must render HeadphoneSupportButton beside its bell`);
  }

  for (const file of [
    'src/screens/agent/AgentDashboardScreen.js',
    'src/screens/lawyer/LawyerDashboardScreen.js',
    'src/screens/lawyer/StateLawyerDashboardScreen.js',
    'src/screens/lawyer/ZonalLawyerDashboardScreen.js',
    'src/screens/lawyer/SuperLawyerDashboardScreen.js',
  ]) {
    const content = read(file);
    assert.match(content, /useAdminNotificationHeader\(navigation\)/, `${file} must use useAdminNotificationHeader for Headphone + Bell`);
  }
});

test('AndroidManifest declares audio permissions needed for Android APK voice calls', () => {
  const manifest = read('android/app/src/main/AndroidManifest.xml');
  assert.match(manifest, /android\.permission\.RECORD_AUDIO/);
  assert.match(manifest, /android\.permission\.MODIFY_AUDIO_SETTINGS/);
});

test('iOS Info.plist declares microphone, background audio, and Ionicons font, and Modal handles UIKit handoff safely', () => {
  const plist = read('ios/RentalHubMobile/Info.plist');
  assert.match(plist, /<key>NSMicrophoneUsageDescription<\/key>/, 'iOS Info.plist must declare NSMicrophoneUsageDescription');
  assert.match(plist, /<key>UIBackgroundModes<\/key>[\s\S]*?<string>audio<\/string>/, 'iOS Info.plist must include audio background mode');
  assert.match(plist, /<string>Ionicons\.ttf<\/string>/, 'iOS Info.plist must bundle Ionicons.ttf for headset/bell/logout icons');

  const btn = read('src/components/calls/HeadphoneSupportButton.js');
  assert.match(btn, /useSafeAreaInsets/, 'HeadphoneSupportButton must pad bottom sheet for iPhone Home Indicator');
  assert.match(btn, /pageSheet/, 'HeadphoneSupportButton directory modal must use iOS pageSheet presentation');
  assert.match(btn, /waitForIosModalDismiss/, 'HeadphoneSupportButton must dismiss its Modal before presenting NativeCallOverlay on iOS UIKit');
});

test('Admin, Zonal, Service, Recruitment, and Lawyer mobile headers include Profile and Logout alongside Headphone and Bell', () => {
  const headerHook = fs.readFileSync(
    path.join(ROOT, 'src/hooks/useAdminNotificationHeader.js'),
    'utf8'
  );
  assert.match(headerHook, /HeadphoneSupportButton/);
  assert.match(headerHook, /NotificationBell/);
  assert.match(headerHook, /navigation\.navigate\('Profile'\)/);
  assert.match(headerHook, /log-out-outline/);
  assert.match(headerHook, /confirmLogout/);

  const nav = fs.readFileSync(path.join(ROOT, 'src/navigation/AppNavigator.js'), 'utf8');
  assert.match(nav, /case 'zonal_support_admin':/);
  assert.match(nav, /ZonalAdminRoot[\s\S]*?<Stack\.Screen name="Messages" component=\{MessagesScreen\} \/>/);

  const serviceScreen = fs.readFileSync(
    path.join(ROOT, 'src/screens/service-admin/ServiceOperationsDashboardScreen.js'),
    'utf8'
  );
  assert.match(serviceScreen, /Zonal transport operations/);
  assert.match(serviceScreen, /Zonal fumigation operations/);
  assert.match(serviceScreen, /Zonal support desk/);
});
