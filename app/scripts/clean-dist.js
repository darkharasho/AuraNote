const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '..', '..', 'dist');

try {
  if (fs.existsSync(distPath)) {
    fs.rmSync(distPath, { recursive: true, force: true });
    console.log('Removed dist directory');
  }
} catch (err) {
  console.error('Failed to remove dist directory:', err);
  process.exit(1);
}
