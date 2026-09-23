#!/usr/bin/env node
// Keeps app.json's Expo version in step with package.json and android/app/build.gradle.
// These three drifted apart once: app.json stayed at 1.0.7 while the real build was
// 1.0.11, so every fresh install reported the old version and the update check kept
// insisting an update was available. Run this before every release build.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkgPath = path.join(root, 'package.json');
const appJsonPath = path.join(root, 'app.json');
const gradlePath = path.join(root, 'android', 'app', 'build.gradle');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = String(pkg.version || '').trim();
if (!version) {
  console.error('package.json has no "version"');
  process.exit(1);
}

const gradle = fs.readFileSync(gradlePath, 'utf8');
const codeMatch = gradle.match(/versionCode\s*=\s*(\d+)/);
if (!codeMatch) {
  console.error('Could not find versionCode in android/app/build.gradle');
  process.exit(1);
}
const versionCode = Number(codeMatch[1]);

const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
appJson.expo.version = version;
appJson.expo.android = { ...(appJson.expo.android || {}), versionCode };
fs.writeFileSync(appJsonPath, `${JSON.stringify(appJson, null, 2)}\n`);

console.log(`app.json synced -> version ${version}, versionCode ${versionCode}`);
