import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const srcDir = path.join(root, 'packages', 'cli', 'src');
const srcFile = path.join(srcDir, 'flash.js');
const outDir = path.join(root, 'bundle');
const outFile = path.join(outDir, 'flash.js');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copySrcToBundle() {
  ensureDir(outDir);
  
  // Copy all .js files recursively
  function copyDir(fromDir, toDir) {
    ensureDir(toDir);
    const entries = fs.readdirSync(fromDir, { withFileTypes: true });
    for (const e of entries) {
      const fromPath = path.join(fromDir, e.name);
      const toPath = path.join(toDir, e.name);
      
      if (e.isDirectory()) {
        // Recursively copy subdirectories
        copyDir(fromPath, toPath);
      } else if (e.isFile() && e.name.endsWith('.js')) {
        fs.copyFileSync(fromPath, toPath);
      }
    }
  }
  
  copyDir(srcDir, outDir);
}

function build() {
  const shebang = '#!/usr/bin/env node\n';
  const header = '// Generated minimal bundle for Flash CLI\n';
  const entryHeader = '\n// Entry runner\n';
  const runner = `\n(async () => {\n  try {\n    await main();\n    // Ensure clean exit\n    process.exit(0);\n  } catch (error) {\n    const msg = error instanceof Error ? (error.stack ?? error.message) : String(error);\n    console.error(msg);\n    process.exit(1);\n  }\n})();\n`;

  copySrcToBundle();
  const current = fs.readFileSync(outFile, 'utf8');
  fs.writeFileSync(outFile, shebang + header + current + entryHeader + runner, 'utf8');
  try { fs.chmodSync(outFile, 0o755); } catch {}
  console.log(`Built ${path.relative(process.cwd(), outFile)}`);
}

build();
