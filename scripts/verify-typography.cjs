const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { transformSync } = require('@babel/core');
const parser = require('@babel/parser');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/theme/index.js'), 'utf8');
const compiled = transformSync(source, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
for (const platform of ['android', 'ios', 'web']) {
  const module = { exports: {} };
  vm.runInNewContext(compiled, { exports: module.exports, module, require: (name) => {
    assert.equal(name, 'react-native');
    return { Platform: { OS: platform, select: (values) => values[platform] ?? values.default } };
  } });
  const { applyResponsiveTextStyle, createTypographyMetrics, resolveTextStyle, typography, textStyles, fontWeightToFamily } = module.exports;
  const body = resolveTextStyle();
  assert.equal(body.fontFamily, typography.regular);
  assert.equal(body.fontSize, 16);
  assert.ok(body.lineHeight >= 22);
  assert.equal(fontWeightToFamily(700), typography.bold);
  for (const [weight, family] of [[400, 'regular'], [500, 'medium'], [600, 'semibold'], [700, 'bold'], ['bold', 'bold'], ['normal', 'regular']]) {
    const resolved = resolveTextStyle({ fontWeight: weight });
    assert.equal(resolved.fontFamily, typography[family]);
    assert.equal(resolved.fontWeight, 'normal');
  }
  const custom = resolveTextStyle({fontFamily: 'AmanaScript', fontSize: 54, fontWeight: '700'});
  assert.equal(custom.fontFamily, 'AmanaScript');
  assert.equal(custom.fontWeight, '700');
  const override = resolveTextStyle({fontSize: 20, lineHeight: 32, color: '#ffffff'}, 'h1');
  assert.equal(override.fontSize, 20);
  assert.equal(override.lineHeight, 32);
  assert.equal(override.color, '#ffffff');
  assert.ok(resolveTextStyle({fontSize: 28}, 'caption').lineHeight >= 35);
  for (const style of Object.values(textStyles)) assert.ok(style.lineHeight >= style.fontSize * 1.2);

  const compact = createTypographyMetrics({ width: 320 });
  assert.equal(compact.headingScale, 0.92);
  const compactTitle = applyResponsiveTextStyle({ fontSize: 28, lineHeight: 36 }, compact);
  assert.equal(compactTitle.fontSize, 26);
  assert.ok(compactTitle.lineHeight >= 33);
  const compactBody = applyResponsiveTextStyle({ fontSize: 16, lineHeight: 24 }, compact);
  assert.equal(compactBody.fontSize, 16);
  assert.equal(compactBody.lineHeight, 24);

  const larger = createTypographyMetrics({ width: 390, largerText: true });
  assert.equal(larger.textScale, 1.12);
  const largerBody = applyResponsiveTextStyle({ fontSize: 16, lineHeight: 24 }, larger);
  assert.equal(largerBody.fontSize, 18);
  assert.ok(largerBody.lineHeight >= 27);
}
function files(dir) {return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? files(path.join(dir,e.name)) : e.name.endsWith('.js') ? [path.join(dir,e.name)] : []);}
let count = 0;
for (const file of [...files(path.join(root,'src/screens')), ...files(path.join(root,'src/components')), ...files(path.join(root,'src/navigation')), path.join(root,'src/App.js')]) {
  const ast = parser.parse(fs.readFileSync(file,'utf8'), {sourceType:'module',plugins:['jsx']});
  if (!file.endsWith('AppTextInput.js')) {
    const nativeImports = ast.program.body.filter(n => n.type === 'ImportDeclaration' && n.source.value === 'react-native');
    assert.ok(!nativeImports.some(n => n.specifiers.some(s => s.imported?.name === 'TextInput')), file + ' must use the shared input font defaults');
  }
  const imports = ast.program.body.filter(n => n.type === 'ImportDeclaration').flatMap(n => n.specifiers.map(s => s.local.name));
  function walk(n) {
    if (!n || typeof n !== 'object') return;
    if (n.type === 'MemberExpression' && n.object.name === 'typeScale') assert.ok(imports.includes('typeScale'), file + ' must import typeScale');
    for (const value of Object.values(n)) if (Array.isArray(value)) value.forEach(walk); else if (value && typeof value === 'object') walk(value);
  }
  walk(ast); count++;
}
const app = fs.readFileSync(path.join(root,'src/App.js'),'utf8');
for (const name of ['Inter-Regular','Inter-Medium','Inter-SemiBold','Inter-Bold']) {
  assert.ok(app.includes("'" + name + "': require("));
  assert.ok(fs.existsSync(path.join(root,'assets/fonts',name + '.ttf')));
}
const appText = fs.readFileSync(path.join(root,'src/components/common/AppText.js'),'utf8');
assert.ok(!appText.includes('allowFontScaling={false}'));
assert.ok(appText.includes('{...props}'));
console.log('Typography behavior passed on Android, iOS, and web; ' + count + ' screen/component files parsed with valid scale imports.');

const themeModule = { exports: {} };
vm.runInNewContext(compiled, {exports: themeModule.exports, module: themeModule, require: () => ({Platform: {select: values => values.android}})});
const inputModule = { exports: {} };
const inputSource = fs.readFileSync(path.join(root,'src/components/common/AppTextInput.js'),'utf8');
const inputCompiled = transformSync(inputSource, {configFile:false,babelrc:false,plugins:['@babel/plugin-transform-modules-commonjs','@babel/plugin-transform-react-jsx']}).code;
vm.runInNewContext(inputCompiled, {exports:inputModule.exports,module:inputModule,require: name => {
  if (name === 'react') return require('react');
  if (name === 'react-native') return {TextInput:'NativeTextInput',StyleSheet:{flatten: values => Array.isArray(values) ? Object.assign({},...values) : values}};
  if (name === '../../context/TypographyContext') return {useTypography: () => ({headingScale: 1, textScale: 1, maxFontSizeMultiplier: 1.3})};
  if (name === '../../theme') return themeModule.exports;
  throw Error(name);
}});
const ref = {current:null};
const onChangeText = () => {};
const input = inputModule.exports.default.render({value:'Existing text',onChangeText,secureTextEntry:true,multiline:true,style:[{fontSize:14},{fontWeight:'600'}]},ref);
assert.equal(input.props.style.fontFamily,'Inter-SemiBold');
assert.equal(input.props.style.fontSize,16);
assert.equal(input.props.style.minHeight,44);
assert.ok(input.props.style.lineHeight>=23);
assert.equal(input.props.value,'Existing text');
assert.equal(input.props.onChangeText,onChangeText);
assert.equal(input.props.ref,ref);
assert.equal(input.props.secureTextEntry,true);
assert.equal(input.props.multiline,true);
console.log('Shared text input preserves refs, callbacks, values, and secure/multiline behavior.');
