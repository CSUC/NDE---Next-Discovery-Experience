const fs = require('fs');
const path = require('path');
const { resolveActiveAddon } = require('./addon-profile-utils');

const distPath = path.join(__dirname, 'dist', 'custom-module');
const activeAddon = resolveActiveAddon();
const addonsDistPath = path.join(__dirname, 'dist', 'addons');
const targetPath = path.join(addonsDistPath, activeAddon.packageName);

if (!fs.existsSync(distPath)) {
  console.error(`Build output not found at ${distPath}`);
  process.exit(1);
}

fs.mkdirSync(addonsDistPath, { recursive: true });
fs.rmSync(targetPath, { recursive: true, force: true });
fs.renameSync(distPath, targetPath);

console.log(`Renamed directory to ${targetPath}`);
console.log(`Add-on build is ready for static hosting at /${path.basename(targetPath)}/`);
