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

const getBuildNumber = () => {
  try {
    const gradle = fs.readFileSync(path.join(ANDROID_DIR, 'app', 'build.gradle'), 'utf8');
    const match = gradle.match(/versionCode\s*=\s*(\d+)/);
    if (match) return match[1];
  } catch {}
  return '1';
};

const writeBuildInfo = (version) => {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const buildNumber = getBuildNumber();
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
    const gradlewCmd = process.platform === 'win32' ? '.\\gradlew' : './gradlew';
    if (process.platform !== 'win32') {
      try {
        fs.chmodSync(path.join(ANDROID_DIR, 'gradlew'), 0o755);
      } catch {}
    }
    run(`${gradlewCmd} assembleRelease --no-daemon --build-cache`, { cwd: ANDROID_DIR });

    const apkPath = path.join(ANDROID_DIR, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
    if (fs.existsSync(apkPath)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      const destPath = path.join(UPLOADS_DIR, 'app.apk');
      fs.copyFileSync(apkPath, destPath);
      // Some operators link to the raw build name; keep both paths on the same build.
      fs.copyFileSync(apkPath, path.join(UPLOADS_DIR, 'app-release.apk'));
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
