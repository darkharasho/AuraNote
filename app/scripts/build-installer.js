const { execSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..', '..');

function run(command) {
  execSync(command, {
    stdio: 'inherit',
    cwd: root,
    env: { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: 'false' }
  });
}

try {
  run('node app/scripts/clean-dist.js');
  run('npx electron-builder');
} catch (err) {
  console.error('Installer build failed:', err);
  process.exit(1);
}
