const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const babel = require('@babel/core');
const traverse = require('@babel/traverse').default;

const navigatorSource = fs.readFileSync('src/navigation/AppNavigator.js', 'utf8');
const ast = babel.parseSync(navigatorSource, { configFile: false, babelrc: false, parserOpts: { plugins: ['jsx'] } });
let rootNode;
traverse(ast, {
  VariableDeclarator(path) {
    if (path.node.id.name === 'SuperAdminRoot') rootNode = path.parent;
  },
});
assert.ok(rootNode, 'Super Admin navigator must exist');
const declaration = navigatorSource.slice(rootNode.start, rootNode.end);
const components = [...declaration.matchAll(/component=\{(\w+)\}/g)].map(match => match[1]);
const context = {
  module: { exports: {} },
  React: { createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat() }) },
  Stack: { Navigator: 'Navigator', Screen: 'Screen' },
  screenOptions: {},
};
for (const name of components) context[name] = function ScreenComponent() {};
for (const match of declaration.matchAll(/\{(common\w+)\(\)\}/g)) context[match[1]] = () => [];
const compiled = babel.transformSync(declaration + '\nmodule.exports=SuperAdminRoot;', {
  configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-react-jsx'],
}).code;
vm.runInNewContext(compiled, context);
const tree = context.module.exports({});
assert.equal(tree.props.initialRouteName, 'SuperAdminDashboard');
const screens = tree.children.filter(child => child?.type === 'Screen');
const home = screens.filter(screen => screen.props.name === 'Home');
assert.equal(home.length, 1, 'The destination must be registered exactly once');
assert.equal(home[0].props.component, context.HomeScreen, 'Explore must open the public marketplace home');
assert.notEqual(home[0].props.options.headerShown, false, 'Keep a visible Back button for iOS');
for (const name of ['PropertyList', 'PropertyDetail', 'LocationInfo', 'Notifications']) {
  assert.ok(screens.some(screen => screen.props.name === name), `Marketplace child destination ${name} must remain available`);
}
const dashboard = fs.readFileSync('src/screens/admin/SuperAdminDashboardScreen.js', 'utf8');
const button = dashboard.match(/accessibilityLabel="Explore homes"[\s\S]*?onPress=\{([^\n]+)\}/);
assert.ok(button, 'Explore control must exist');
let destination;
vm.runInNewContext('(' + button[1] + ')()', { navigation: { navigate: name => { destination = name; } } });
assert.equal(destination, home[0].props.name, 'The actual button must target a registered marketplace screen');
console.log('PASS: Super Admin Explore opens marketplace Home; dashboard remains initial, Back stays visible, and search/detail/notification routes remain available.');
