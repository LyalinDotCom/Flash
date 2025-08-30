import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const bundlePath = path.join(root, 'bundle', 'flash.js');
const binDir = path.join(root, '.global', 'bin');
const linkPath = path.join(binDir, 'Flash');
const linkPathLower = path.join(binDir, 'flash');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function linkLocal() {
  if (!fs.existsSync(bundlePath)) {
    console.error('[Flash link] Bundle not found. Run build first.');
    process.exit(1);
  }
  ensureDir(binDir);
  try {
    if (fs.existsSync(linkPath) || fs.lstatSync(linkPath).isSymbolicLink?.()) {
      fs.rmSync(linkPath, { force: true });
    }
  } catch {}
  fs.symlinkSync(bundlePath, linkPath);
  try { fs.chmodSync(linkPath, 0o755); } catch {}
  console.log(`[Flash link] Linked: ${linkPath} -> ${bundlePath}`);
  // Also create lowercase alias for convenience
  try {
    if (fs.existsSync(linkPathLower) || fs.lstatSync(linkPathLower).isSymbolicLink?.()) {
      fs.rmSync(linkPathLower, { force: true });
    }
  } catch {}
  fs.symlinkSync(bundlePath, linkPathLower);
  try { fs.chmodSync(linkPathLower, 0o755); } catch {}
  console.log(`[Flash link] Linked: ${linkPathLower} -> ${bundlePath}`);
  console.log(`[Flash link] Add to PATH: ${path.join(root, '.global', 'bin')}`);
}

linkLocal();
