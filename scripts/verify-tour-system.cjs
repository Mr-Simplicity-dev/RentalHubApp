const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const entryPath = path.join(directory, entry.name);
  if (entry.isDirectory()) return walk(entryPath);
  return entry.isFile() ? [entryPath] : [];
});

const { SUPPORTED_LANGUAGES, UI_COPY } = require('../src/i18n/catalog.cjs');
const { TOUR_STEP_COPY, TOUR_STEP_IDS } = require('../src/i18n/tourStepCatalog.cjs');
const {
  chooseNewestResumeCandidate,
  sanitizeTourContext,
  sanitizeTourIdentifier,
} = require('../src/services/tourPolicy.cjs');

const languageCodes = SUPPORTED_LANGUAGES.map(({ code }) => code);
assert.deepEqual(languageCodes, ['en', 'fr', 'ar', 'ru', 'zh']);
assert.equal(SUPPORTED_LANGUAGES.find(({ code }) => code === 'ar').rtl, true);

const englishUiKeys = Object.keys(UI_COPY.en).sort();
for (const language of languageCodes) {
  assert.deepEqual(
    Object.keys(UI_COPY[language] || {}).sort(),
    englishUiKeys,
    `${language} must contain every tour/settings UI key`
  );
  assert.deepEqual(
    Object.keys(TOUR_STEP_COPY[language] || {}).sort(),
    [...TOUR_STEP_IDS].sort(),
    `${language} must contain every configured step copy key`
  );
  for (const id of TOUR_STEP_IDS) {
    const [title, description] = TOUR_STEP_COPY[language][id] || [];
    assert.ok(title?.trim(), `${language}.${id} needs a title`);
    assert.ok(description?.trim(), `${language}.${id} needs a description`);
  }
}

const configSource = read('src/config/tourConfig.js');
const configuredStepIds = [...configSource.matchAll(/step\(\s*'([^']+)'/g)]
  .map((match) => match[1]);
assert.ok(configuredStepIds.length > 40, 'expected comprehensive role tour coverage');
assert.deepEqual(
  [...new Set(configuredStepIds)].sort(),
  [...TOUR_STEP_IDS].sort(),
  'configured steps and localized step IDs must match exactly'
);

const sourceFiles = walk(path.join(root, 'src'))
  .filter((file) => file.endsWith('.js'))
  .filter((file) => !file.includes(`${path.sep}config${path.sep}tourConfig.js`))
  .filter((file) => !file.includes(`${path.sep}i18n${path.sep}`));
const registrationFiles = sourceFiles
  .filter((file) => {
    const source = fs.readFileSync(file, 'utf8');
    return /useTourTarget|<TourTarget|tourTarget=/.test(source);
  });
const registrationSources = registrationFiles
  .map((file) => fs.readFileSync(file, 'utf8'))
  .join('\n');
for (const stepId of TOUR_STEP_IDS) {
  assert.ok(
    registrationSources.includes(`'${stepId}'`) ||
      registrationSources.includes(`"${stepId}"`),
    `${stepId} must be registered by a screen outside tourConfig`
  );
}

const navigatorSource = read('src/navigation/AppNavigator.js');
const registeredRoutes = new Set(
  [...navigatorSource.matchAll(/<(?:Stack|Tab)\.Screen\s+name="([^"]+)"/g)]
    .map((match) => match[1])
);
const actionableRoutes = [...configSource.matchAll(/workflow\(\s*'([^']+)'/g)]
  .map((match) => match[1]);
for (const routeName of new Set(actionableRoutes)) {
  assert.ok(registeredRoutes.has(routeName), `${routeName} must be registered in AppNavigator`);
}

const tourContextSource = read('src/context/TourContext.js');
for (const eventName of [
  'welcome_shown',
  'started',
  'resumed',
  'replayed',
  'step_viewed',
  'step_completed',
  'step_skipped',
  'action_completed',
  'target_missing',
  'step_unavailable',
  'paused',
  'completed',
  'skipped',
  'dismissed',
]) {
  assert.ok(tourContextSource.includes(`'${eventName}'`), `mobile must emit ${eventName}`);
}

const localNewer = { timestamp: Date.parse('2026-08-01T12:00:00Z'), stepId: 'local' };
const remoteOlder = { timestamp: Date.parse('2026-08-01T11:00:00Z'), stepId: 'remote' };
assert.equal(chooseNewestResumeCandidate({
  localCandidate: localNewer,
  remoteCandidate: remoteOlder,
  remoteState: { status: 'in_progress' },
}).stepId, 'local', 'newer offline progress must win');
assert.equal(chooseNewestResumeCandidate({
  localCandidate: remoteOlder,
  remoteCandidate: localNewer,
  remoteState: { status: 'in_progress' },
}).stepId, 'local', 'newer server progress must win');
assert.equal(chooseNewestResumeCandidate({
  localCandidate: remoteOlder,
  remoteCandidate: null,
  remoteState: { status: 'completed', last_completed_at: '2026-08-01T12:30:00Z' },
}), null, 'a newer terminal server event must block stale local resume');

assert.equal(
  sanitizeTourIdentifier('ResetPassword?token=secret#fragment'),
  'ResetPassword',
  'route analytics must remove query strings and fragments'
);
assert.deepEqual(
  sanitizeTourContext({
    action_required: true,
    message: 'private user text',
    route: 'Messages?token=secret',
    workflow_id: 'applications messages',
  }),
  {
    action_required: true,
    route: 'Messages',
    workflow_id: 'applications_messages',
  },
  'analytics context must whitelist only non-PII identifiers'
);

const androidManifest = read('android/app/src/main/AndroidManifest.xml');
const androidLocales = read('android/app/src/main/res/xml/locales_config.xml');
assert.match(androidManifest, /android:supportsRtl="true"/);
assert.match(androidManifest, /android:localeConfig="@xml\/locales_config"/);
for (const language of languageCodes) {
  assert.ok(androidLocales.includes(`android:name="${language}"`), `Android must declare ${language}`);
}

const iosInfo = read('ios/RentalHubMobile/Info.plist');
const xcodeProject = read('ios/RentalHubMobile.xcodeproj/project.pbxproj');
assert.ok(iosInfo.includes('<key>CFBundleLocalizations</key>'));
for (const language of languageCodes) {
  assert.ok(iosInfo.includes(`<string>${language}</string>`), `iOS Info.plist must declare ${language}`);
  assert.ok(new RegExp(`\\b${language},`).test(xcodeProject), `Xcode knownRegions must contain ${language}`);
}

// Real Babel transforms catch JSX/import regressions in the tour engine and in
// every screen that registers a tour target, without building an APK/bundle.
const babel = require('@babel/core');
const babelFiles = [...new Set([
  ...registrationFiles,
  path.join(root, 'src/App.js'),
  path.join(root, 'src/config/tourConfig.js'),
  path.join(root, 'src/context/LanguageContext.js'),
  path.join(root, 'src/context/TourContext.js'),
  path.join(root, 'src/components/tour/NativeTourManager.js'),
  path.join(root, 'src/components/tour/TourNavigationBridge.js'),
  path.join(root, 'src/components/tour/TourTarget.js'),
  path.join(root, 'src/screens/settings/SettingsScreen.js'),
])];
const baseBabelOptions = babel.loadOptions({
  babelrc: false,
  configFile: path.join(root, 'babel.config.js'),
  filename: babelFiles[0],
});
for (const file of babelFiles) {
  babel.transformSync(fs.readFileSync(file, 'utf8'), {
    ...baseBabelOptions,
    ast: false,
    code: false,
    filename: file,
  });
}

process.stdout.write(
  `Tour contract verified: ${TOUR_STEP_IDS.length} steps, ${languageCodes.length} locales, ` +
  `${new Set(actionableRoutes).size} actionable routes, ${babelFiles.length} Babel-checked source files.\n`
);
