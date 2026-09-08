const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'dashboard', 'dist');
const dst = path.join(__dirname, '..', 'dist', 'dashboard');

if (!fs.existsSync(src)) {
  console.log('dashboard/dist not found, skipping copy');
  process.exit(0);
}

function copyDirSync(srcDir, dstDir) {
  fs.mkdirSync(dstDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const dstPath = path.join(dstDir, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

fs.rmSync(dst, { recursive: true, force: true });
copyDirSync(src, dst);
console.log('Copied dashboard/dist -> dist/dashboard');
