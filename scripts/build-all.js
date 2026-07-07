const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const ANDROID_DIR = path.join(ROOT, 'android');
const UPLOADS_DIR = path.resolve(ROOT, '..', 'uploads');
const PKG_PATH = path.join(ROOT, 'package.json');
const VERSION_JSON_PATH = path.join(UPLOADS_DIR, 'version.json');

const run = (cmd, opts = {}) => {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts });
};

const getNextBuildNumber = () => {
  try {
    if (fs.existsSync(VERSION_JSON_PATH)) {
      const prev = JSON.parse(fs.readFileSync(VERSION_JSON_PATH, 'utf8'));
      return String(parseInt(prev.buildNumber || '0', 10) + 1);
    }
  } catch {}
  return '1';
};

const writeBuildInfo = (version) => {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const buildNumber = getNextBuildNumber();
  const info = {
    version,
    buildNumber,
    lastUpdated: new Date().toISOString(),
  };
  fs.writeFileSync(VERSION_JSON_PATH, JSON.stringify(info, null, 2));
  console.log(`\n>>> Build info: v${version} (build ${buildNumber})`);
};

const main = () => {
  const platform = process.argv[2] || 'android';

  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
  const version = pkg.version || '1.0.0';

  console.log(`=== Building RentalHub Mobile v${version} for ${platform} ===\n`);

  if (platform === 'android' || platform === 'all') {
    console.log('>>> Building Android APK...');
    run(`cd android && .\\gradlew assembleRelease --no-daemon --build-cache`, { cwd: ANDROID_DIR });

    const apkPath = path.join(ANDROID_DIR, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
    if (fs.existsSync(apkPath)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      const destPath = path.join(UPLOADS_DIR, 'app.apk');
      fs.copyFileSync(apkPath, destPath);
      writeBuildInfo(version);
      const size = fs.statSync(apkPath).size;
      console.log(`>>> APK: ${(size / 1024 / 1024).toFixed(1)} MB`);
      console.log(`>>> Copied to: ${destPath}`);
    }
  }

  if (platform === 'ios' || platform === 'all') {
    console.log('>>> iOS build requires EAS Build (macOS/CI)');
    console.log('    Run: npx eas build -p ios --profile preview --non-interactive');
  }

  console.log('\n=== Done ===');
};

main();
