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
assert.deepEqual(languageCodes, ['en', 'fr', 'ar', 'ru', 'zh', 'ha', 'yo', 'ig']);
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
    TOUR_STEP_IDS.filter(id=>language==='en'||!/^(admin_|lga_admin_|state_|financial_|lga_financial_|super_|service_|support_|recruitment_|zonal_)/.test(id)).sort(),
    `${language} must contain every configured step copy key`
  );
  for (const id of TOUR_STEP_IDS.filter(id=>language==='en'||!/^(admin_|lga_admin_|state_|financial_|lga_financial_|super_|service_|support_|recruitment_|zonal_)/.test(id))) {
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
let babel = null;
try {
  babel = require('@babel/core');
} catch {
  // @babel/core not installed in environment yet
}

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

if (babel) {
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
}

process.stdout.write(
  `Tour contract verified: ${TOUR_STEP_IDS.length} steps, ${languageCodes.length} locales, ` +
  `${new Set(actionableRoutes).size} actionable routes, ${babelFiles.length} source files${babel ? ' (Babel verified)' : ''}.\n`
);

const vmTour=require('node:vm');const tourModule={exports:{}};
const compiledTour=require('@babel/core').transformSync(configSource,{configFile:false,babelrc:false,plugins:['@babel/plugin-transform-modules-commonjs']}).code;
vmTour.runInNewContext(compiledTour,{module:tourModule,exports:tourModule.exports,require:()=>require('../src/i18n/tourStepCatalog.cjs')});
for(const role of ['tenant','landlord']){const ids=tourModule.exports.getTourWorkflowCatalog(role).flatMap(w=>w.stepIds);for(const id of [role+'_more',role+'_wallet',role+'_disputes',role+'_reports',role+'_assistance','public_careers','public_cases'])assert.ok(ids.includes(id),role+' selectable workflows must expose '+id);}
console.log('Updated workflow groups expose Wallet, Disputes, Property Reports, coverage, Careers and Cases.');

const adminRoles = ['admin','lga_admin','zonal_admin','state_admin','financial_admin','lga_financial_admin','state_financial_admin','super_financial_admin','lga_support_admin','state_support_admin','super_support_admin','transportation_admin','lga_transportation_admin','state_transportation_admin','super_transportation_admin','fumigation_admin','lga_fumigation_admin','state_fumigation_admin','super_fumigation_admin','recruitment_admin','super_admin'];
for (const role of adminRoles) {
  for (const locale of languageCodes) {
    const steps = tourModule.exports.getTourStepsForRole(role,locale);
    assert.equal(JSON.stringify(steps),JSON.stringify(tourModule.exports.getTourStepsForRole(role,'en')),role+' must remain English');
    assert.equal(new Set(steps.map(step=>step.id)).size, steps.length, role+' tour must not repeat steps');
    const availableIds = tourModule.exports.getTourWorkflowCatalog(role,locale).flatMap(item=>item.stepIds);
    for (const step of steps) {
      assert.ok(availableIds.includes(step.id), role+' must expose '+step.id+' in selectable workflows');
      const destination = tourModule.exports.getTourDestinationForRole(role,step);
      assert.ok(registeredRoutes.has(destination.name), role+' has an unregistered tour destination '+destination.name);
    }
  }
}
for (const [id,panel] of Object.entries({super_users:'users',super_requests:'property_requests',super_pricing:'pricing',super_approvals:'pending_approvals',super_access:'registration_access'})) {
  assert.equal(tourModule.exports.getTourDestinationForRole('super_admin',{id}).params.initialPanel,panel);
}
assert.equal(tourModule.exports.getTourDestinationForRole('zonal_admin').name,'ZonalDashboard');
assert.ok(tourModule.exports.getTourStepsForRole('super_admin').some(step=>step.id==='recruitment_opportunities' && step.destination.name==='RecruitmentAdmin'));
console.log('All 21 administrative roles verified across 8 locales, including Super Admin workspace routing and zonal scope.');

const parser = require('@babel/parser');
const navigationAst = parser.parse(navigatorSource,{sourceType:'module',plugins:['jsx']});
const declarations = new Map();
const screenImports = new Map();
const walkNode = (node,visit) => { if(!node || typeof node!=='object')return; if(node.type)visit(node); for(const value of Object.values(node)){ if(Array.isArray(value))value.forEach(child=>walkNode(child,visit)); else if(value && typeof value==='object')walkNode(value,visit); } };
walkNode(navigationAst,node=>{
 if(node.type==='VariableDeclarator' && node.id.type==='Identifier') declarations.set(node.id.name,node.init);
 if(node.type==='ImportDeclaration' && node.source.value.startsWith('.')) for(const specifier of node.specifiers) screenImports.set(specifier.local.name,path.resolve(root,'src/navigation',node.source.value));
});
const rootByRole = new Map();
walkNode(declarations.get('RoleRouter'),node=>{if(node.type!=='SwitchStatement')return;let pending=[];for(const branch of node.cases){if(branch.test?.type==='StringLiteral')pending.push(branch.test.value);const result=branch.consequent.find(item=>item.type==='ReturnStatement')?.argument;if(result?.type==='JSXElement'){const name=result.openingElement.name.name;for(const role of pending)rootByRole.set(role,name);pending=[];}}});
const routeComponents = name => {
 const routes=new Map(),seen=new Set();
 const collect = symbol => { if(seen.has(symbol))return; seen.add(symbol);walkNode(declarations.get(symbol),node=>{
  if(node.type==='CallExpression' && node.callee.type==='Identifier' && /^common.*Screens$/.test(node.callee.name))collect(node.callee.name);
  if(node.type!=='JSXOpeningElement' || node.name.type!=='JSXMemberExpression' || node.name.property.name!=='Screen')return;
  const name=node.attributes.find(attr=>attr.name?.name==='name')?.value?.value;
  const component=node.attributes.find(attr=>attr.name?.name==='component')?.value?.expression?.name;
  if(name)routes.set(name,component);
 });};collect(name);return routes;
};
const screenCorpus = (component,seen=new Set()) => {
 if(seen.has(component))return '';seen.add(component);
 if(declarations.has(component))return navigatorSource;
 const imported=screenImports.get(component);if(!imported)return '';
 const file=['.js','.jsx','/index.js'].map(ext=>imported+ext).find(file=>fs.existsSync(file));
 if(!file)return '';let source=fs.readFileSync(file,'utf8');
 const collectLocal=(file,visited=new Set())=>{if(visited.has(file))return '';visited.add(file);const content=fs.readFileSync(file,'utf8');let result=content;for(const match of content.matchAll(/from\s+['"]([^'"]+)['"]/g)){if(!match[1].startsWith('.')||!match[1].includes('components'))continue;const prefix=path.resolve(path.dirname(file),match[1]);const child=['.js','.jsx','/index.js'].map(ext=>prefix+ext).find(p=>fs.existsSync(p));if(child)result+='\n'+collectLocal(child,visited);}return result;};return collectLocal(file);
};
const mismatches=[];
for(const [role,rootName] of rootByRole){
 if(role==='user')continue;
 const routes=routeComponents(rootName);
 const steps=tourModule.exports.getTourStepsForRole(role);
 for(const step of steps){
  const preparation=tourModule.exports.getTourPreparationDestinationForRole(role,step);
  if(!routes.has(preparation.name)){mismatches.push(role+': '+step.id+' prepares unavailable '+preparation.name);continue;}
  let component = routes.get(preparation.name);
  let corpus;
  if (declarations.has(component) && preparation.params?.screen) {
    const nestedComponent = routeComponents(component).get(preparation.params.screen);
    corpus = step.id.startsWith('tab_') ? navigatorSource : screenCorpus(nestedComponent);
  } else { corpus=screenCorpus(component); }
  if(!corpus.includes(step.id))mismatches.push(role+': '+step.id+' is absent from '+preparation.name);
 }
}
assert.deepEqual(mismatches,[],'tour targets must exist on the screen reachable by the signed-in role');
for(const role of ['agent','lawyer','state_lawyer','zonal_lawyer','super_lawyer'])assert.ok(!tourModule.exports.getTourStepsForRole(role).some(step=>step.id.startsWith('tab_')),'non-tab role must not receive tenant tab steps');
console.log('Role navigation and target-screen audit passed for '+rootByRole.size+' roles.');
