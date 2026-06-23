const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const UPLOADS_DIR = path.resolve(ROOT, '..', 'uploads');
const APP_JSON = path.join(ROOT, 'app.json');

const run = (cmd) => {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: ROOT });
};

const main = async () => {
  const platform = process.argv[2] || 'all';

  if (!process.env.EXPO_TOKEN) {
    console.log('EXPO_TOKEN not set. Run: eas login');
    console.log('Or set EXPO_TOKEN env var for CI builds.');
  }

  if (!fs.existsSync(APP_JSON)) {
    console.error('app.json not found. Run this script from RentalHubMobile/');
    process.exit(1);
  }

  console.log(`=== EAS Build: ${platform} ===\n`);

  if (platform === 'android' || platform === 'all') {
    console.log('>>> Building Android...');
    run(`npx eas build -p android --profile preview --non-interactive`);

    console.log('\n>>> After build completes, download the APK from EAS dashboard');
    console.log('    and copy to uploads/app.apk');
  }

  if (platform === 'ios' || platform === 'all') {
    console.log('>>> Building iOS...');
    console.log('    NOTE: Requires Apple Developer account with distribution cert');
    run(`npx eas build -p ios --profile preview --non-interactive`);
  }

  console.log('\n=== Done ===');
  console.log(`\nNext steps:`);
  console.log(`  1. Check build status: eas build:list`);
  console.log(`  2. Download artifact from EAS dashboard`);
  console.log(`  3. Copy APK to ${UPLOADS_DIR}\\app.apk`);
  console.log(`  4. For iOS IPA, upload to App Store Connect or distribute via TestFlight`);
};

main().catch(console.error);
