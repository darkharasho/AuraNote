const { execSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');

try {
  execSync('node scripts/clean-dist.js', { stdio: 'inherit', cwd: root });
  execSync('npx electron-builder', {
    stdio: 'inherit',
    cwd: root,
    env: { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: 'false' }
  });
} catch (err) {
  console.error('Installer build failed:', err);
  process.exit(1);
}
