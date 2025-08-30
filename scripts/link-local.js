import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const bundlePath = path.join(root, 'bundle', 'flash.js');
const binDir = path.join(root, '.global', 'bin');
const linkPath = path.join(binDir, 'Flash');

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
  console.log(`[Flash link] Add to PATH: ${path.join(root, '.global', 'bin')}`);
}

linkLocal();

