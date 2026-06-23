const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const outDir = path.join(projectRoot, 'build', 'generated', 'autolinking');

const config = JSON.parse(
  execSync('npx.cmd @react-native-community/cli config', {
    encoding: 'utf8',
    cwd: projectRoot,
  })
);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'autolinking.json'), JSON.stringify(config, null, 2));
console.log('autolinking.json created at:', path.join(outDir, 'autolinking.json'));
