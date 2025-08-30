import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function parseDotEnv(content) {
  const result = {};
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    result[key] = val;
  }
  return result;
}

function findFlashRoot(fromUrl) {
  let dir = path.dirname(fileURLToPath(fromUrl));
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, 'flash.config.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

export function loadEnv() {
  const tried = [];
  const cwdEnv = path.join(process.cwd(), '.env');
  tried.push(cwdEnv);
  const root = findFlashRoot(import.meta.url);
  if (root) {
    tried.push(path.join(root, '.env'));
    tried.push(path.join(root, 'packages', 'genkit', '.env'));
  }
  for (const p of tried) {
    try {
      if (!fs.existsSync(p)) continue;
      const vars = parseDotEnv(fs.readFileSync(p, 'utf8'));
      for (const [k, v] of Object.entries(vars)) {
        if (typeof process.env[k] === 'undefined') {
          process.env[k] = v;
        }
      }
      // If we loaded anything, stop.
      return;
    } catch {
      // ignore
    }
  }
}

