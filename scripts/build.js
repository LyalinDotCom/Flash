import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const srcFile = path.join(root, 'packages', 'cli', 'src', 'flash.js');
const outDir = path.join(root, 'bundle');
const outFile = path.join(outDir, 'flash.js');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function build() {
  const shebang = '#!/usr/bin/env node\n';
  const header = '// Generated minimal bundle for Flash CLI\n';
  const entryHeader = '\n// Entry runner\n';
  const runner = `\n(async () => {\n  try {\n    await main();\n  } catch (error) {\n    const msg = error instanceof Error ? (error.stack ?? error.message) : String(error);\n    console.error(msg);\n    process.exit(1);\n  }\n})();\n`;

  const src = fs.readFileSync(srcFile, 'utf8');
  ensureDir(outDir);
  fs.writeFileSync(outFile, shebang + header + src + entryHeader + runner, 'utf8');
  try {
    fs.chmodSync(outFile, 0o755);
  } catch {}
  console.log(`Built ${path.relative(process.cwd(), outFile)}`);
}

build();
