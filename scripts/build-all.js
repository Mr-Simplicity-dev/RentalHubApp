const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const ANDROID_DIR = path.join(ROOT, 'android');
const UPLOADS_DIR = path.resolve(ROOT, '..', 'uploads');

const run = (cmd, opts = {}) => {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts });
};

const main = () => {
  const platform = process.argv[2] || 'android';

  console.log(`=== Building RentalHub Mobile for ${platform} ===\n`);

  if (platform === 'android' || platform === 'all') {
    console.log('>>> Building Android APK...');
    run(`cd android && .\\gradlew assembleDebug --no-daemon -PreactNativeArchitectures=arm64-v8a --build-cache`, { cwd: ANDROID_DIR });

    const apkPath = path.join(ANDROID_DIR, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
    if (fs.existsSync(apkPath)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      fs.copyFileSync(apkPath, path.join(UPLOADS_DIR, 'app.apk'));
      const size = fs.statSync(apkPath).size;
      console.log(`\n>>> APK built: ${(size / 1024 / 1024).toFixed(1)} MB`);
      console.log(`>>> Copied to: ${path.join(UPLOADS_DIR, 'app.apk')}`);
    }
  }

  if (platform === 'ios' || platform === 'all') {
    console.log('>>> iOS build requires EAS Build (macOS/CI)');
    console.log('    Run: npx eas build -p ios --profile preview --non-interactive');
  }

  console.log('\n=== Done ===');
};

main();
