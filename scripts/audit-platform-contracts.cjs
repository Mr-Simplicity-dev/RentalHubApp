const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

const mobileRoot = path.resolve(__dirname, '..');
const root = path.dirname(mobileRoot);
const verbs = new Set(['get', 'post', 'put', 'patch', 'delete']);
const cache = new Map(), parseErrors = [], missingImports = [];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return ['node_modules', 'build', '__tests__'].includes(entry.name) ? [] : walk(file);
    return /\.(?:[cm]?js|jsx|ts|tsx)$/.test(entry.name) && !/\.(?:test|spec)\./.test(entry.name) ? [file] : [];
  });
}
function visit(node, fn) {
  if (!node || typeof node !== 'object') return;
  if (node.type) fn(node);
  for (const [key, value] of Object.entries(node)) {
    if (['loc', 'start', 'end', 'tokens', 'comments'].includes(key)) continue;
    if (Array.isArray(value)) value.forEach(child => visit(child, fn));
    else if (value && typeof value === 'object') visit(value, fn);
  }
}
function read(file) {
  if (cache.has(file)) return cache.get(file);
  let ast;
  try { ast = parser.parse(fs.readFileSync(file, 'utf8'), { sourceType: 'unambiguous', plugins: ['jsx', ...(/\.tsx?$/.test(file) ? ['typescript'] : [])] }); }
  catch (error) { parseErrors.push({ file: path.relative(root, file), line: error.loc?.line, message: error.reasonCode }); ast = { type: 'Program', body: [] }; }
  const constants = new Map(), requires = new Map(), imports = [];
  visit(ast, node => {
    if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && node.init) {
      if (['StringLiteral', 'TemplateLiteral', 'BinaryExpression'].includes(node.init.type)) constants.set(node.id.name, node.init);
      if (node.init.type === 'CallExpression' && node.init.callee.name === 'require' && node.init.arguments[0]?.type === 'StringLiteral') requires.set(node.id.name, node.init.arguments[0].value);
    }
    if (node.type === 'ImportDeclaration' || node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration') { if (node.source) imports.push(node.source.value); }
    if (node.type === 'CallExpression' && node.callee.name === 'require' && node.arguments[0]?.type === 'StringLiteral') imports.push(node.arguments[0].value);
  });
  const result = { ast, constants, requires, imports }; cache.set(file, result); return result;
}
function resolve(from, specifier) {
  if (!specifier?.startsWith('.')) return null;
  const base = path.resolve(path.dirname(from), specifier);
  return [base, ...['.js', '.jsx', '.cjs', '.mjs', '.ts', '.tsx'].map(ext => base + ext), ...['index.js', 'index.jsx', 'index.cjs'].map(name => path.join(base, name))]
    .find(file => fs.existsSync(file) && fs.statSync(file).isFile()) || null;
}
function value(node, info, seen = new Set()) {
  if (!node) return null;
  if (node.type === 'StringLiteral') return node.value;
  if (node.type === 'TemplateLiteral') return node.quasis.map((part, index) => part.value.cooked + (index < node.expressions.length ? value(node.expressions[index], info, seen) ?? ':param' : '')).join('');
  if (node.type === 'BinaryExpression' && node.operator === '+') return (value(node.left, info, seen) ?? ':param') + (value(node.right, info, seen) ?? ':param');
  if (node.type === 'Identifier' && info.constants.has(node.name) && !seen.has(node.name)) return value(info.constants.get(node.name), info, new Set([...seen, node.name]));
  return null;
}
function normalized(input) { return ('/' + input).replace(/\/+/g, '/').split('?')[0].split('#')[0].replace(/\/$/, '') || '/'; }
function matches(request, route) {
  const a = normalized(request).split('/').filter(Boolean), b = normalized(route).split('/').filter(Boolean);
  if (b.at(-1) === '*' && b.length > 1) return a.length >= b.length - 1 && b.slice(0, -1).every((part, i) => part.startsWith(':') || part === a[i]);
  return a.length === b.length && a.every((part, i) => part.includes(':param') || b[i].startsWith(':') || part === b[i]);
}
function requiredFile(node, info, from) {
  const specifier = node?.type === 'Identifier' ? info.requires.get(node.name) : node?.type === 'CallExpression' && node.callee.name === 'require' ? value(node.arguments[0], info) : null;
  return specifier ? resolve(from, specifier) : null;
}
const routes = [], visitedRoutes = new Set();
function collectRoutes(file, prefix = '') {
  const key = file + '|' + prefix;
  if (visitedRoutes.has(key)) return;
  visitedRoutes.add(key);
  const info = read(file);
  visit(info.ast, node => {
    if (node.type === 'AssignmentExpression' && node.left.type === 'MemberExpression' && node.left.object.name === 'module' && node.left.property.name === 'exports') {
      const delegate = requiredFile(node.right, info, file); if (delegate) collectRoutes(delegate, prefix);
    }
    if (node.type !== 'CallExpression' || node.callee.type !== 'MemberExpression') return;
    const method = node.callee.property.name;
    const owner = node.callee.object;
    if (method === 'use' && ['app', 'router'].includes(owner.name)) {
      const mount = value(node.arguments[0], info);
      for (const arg of node.arguments.slice(mount === null ? 0 : 1)) {
        const nested = requiredFile(arg, info, file);
        if (nested && nested.includes(path.sep + 'routes' + path.sep)) collectRoutes(nested, normalized(prefix + '/' + (mount || '')));
      }
    }
    if (verbs.has(method) && ['app', 'router'].includes(owner.name)) {
      const candidates = node.arguments[0]?.type === 'ArrayExpression' ? node.arguments[0].elements : [node.arguments[0]];
      for (const candidate of candidates) {
        const endpoint = value(candidate, info); if (endpoint !== null) routes.push({ method, path: normalized(prefix + '/' + endpoint), file: path.relative(root, file), line: node.loc.start.line });
      }
    }
  });
}
collectRoutes(path.join(root, 'server.js'));
const calls = [], dynamicCalls = [], nativeScreens = new Set(), nativeNavigation = [], webRoutes = [], webLinks = [];
const files = [...walk(path.join(mobileRoot, 'src')), ...walk(path.join(root, 'client', 'src'))];
for (const file of files) {
  const info = read(file), platform = file.startsWith(mobileRoot + path.sep) ? 'mobile' : 'web';
  for (const specifier of info.imports) {
    if (specifier.startsWith('.') && !resolve(file, specifier) && !/\.(?:json|css|svg|png|jpe?g|webp|ttf|woff2?|mp3|mp4|d\.ts)$/.test(specifier)) missingImports.push({ file: path.relative(root, file), specifier });
  }
  visit(info.ast, node => {
    const at = { platform, file: path.relative(root, file), line: node.loc?.start.line };
    if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression') {
      const owner = node.callee.object.name, method = node.callee.property.name;
      if (owner === 'api' && verbs.has(method)) {
        const endpoint = value(node.arguments[0], info);
        if (endpoint?.startsWith('/')) calls.push({ ...at, method, path: normalized(endpoint).replace(/^\/api(?=\/)/, '') });
        else dynamicCalls.push({ ...at, method, expression: node.arguments[0]?.type });
      }
      if (platform === 'mobile' && ['navigation', 'navigationRef'].includes(owner) && ['navigate', 'push', 'replace'].includes(method)) {
        const target = value(node.arguments[0], info); if (target !== null && !target.includes(':param')) nativeNavigation.push({ ...at, target });
      }
    }
    if (platform === 'web' && node.type === 'CallExpression' && node.callee.name === 'navigate') {
      const target = value(node.arguments[0], info); if (target?.startsWith('/')) webLinks.push({ ...at, target: normalized(target) });
    }
    if (node.type === 'JSXOpeningElement') {
      const name = node.name.name || node.name.property?.name;
      for (const attr of node.attributes) {
        const attrValue = attr.value?.type === 'JSXExpressionContainer' ? attr.value.expression : attr.value;
        const text = value(attrValue, info);
        if (text === null) continue;
        if (platform === 'mobile' && name === 'Screen' && attr.name?.name === 'name') nativeScreens.add(text);
        if (platform === 'web' && name === 'Route' && attr.name?.name === 'path' && text !== '*') webRoutes.push(normalized(text));
        if (platform === 'web' && ['Link', 'NavLink', 'Navigate'].includes(name) && attr.name?.name === 'to' && text.startsWith('/')) webLinks.push({ ...at, target: normalized(text) });
      }
    }
  });
}
const unmatchedApi = calls.filter(call => !routes.some(route => route.method === call.method && matches(call.path, route.path.replace(/^\/api(?=\/)/, ''))));
const unmatchedNavigation = nativeNavigation.filter(call => !nativeScreens.has(call.target));
const unmatchedWebLinks = webLinks.filter(call => !webRoutes.some(route => matches(call.target, route)));
const report = { summary: { productionFilesParsed: files.length, backendRoutes: routes.length, apiCalls: calls.length, unresolvedDynamicApiCalls: dynamicCalls.length, nativeScreens: nativeScreens.size, nativeNavigationCalls: nativeNavigation.length, webRoutes: webRoutes.length, webNavigationCalls: webLinks.length }, parseErrors, missingImports, unmatchedApi, unmatchedNavigation, unmatchedWebLinks, dynamicCalls };
const output = process.argv.find(arg => arg.startsWith('--json='))?.slice(7);
if (output) fs.writeFileSync(path.resolve(output), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ summary: report.summary, counts: Object.fromEntries(Object.entries(report).filter(([, list]) => Array.isArray(list)).map(([key, list]) => [key, list.length])), ...Object.fromEntries(Object.entries(report).filter(([, list]) => Array.isArray(list)).map(([key, list]) => [key, list.slice(0, 25)])) }, null, 2));
process.exitCode = parseErrors.length || missingImports.length || unmatchedApi.length || unmatchedNavigation.length || unmatchedWebLinks.length ? 1 : 0;
