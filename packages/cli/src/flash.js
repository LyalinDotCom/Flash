import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';
import { loadFlashConfig } from './config.js';
import { runGenkitGenerate } from './genkitRunner.js';
import { loadEnv } from './env.js';

function getPackageVersion() {
  try {
    // Resolve from the current module location and search upwards for package.json
    let dir = path.dirname(fileURLToPath(import.meta.url));
    for (let i = 0; i < 5; i++) {
      const candidate = path.join(dir, 'package.json');
      if (fs.existsSync(candidate)) {
        const pkg = JSON.parse(fs.readFileSync(candidate, 'utf8'));
        if (pkg && pkg.version) return pkg.version;
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch {}
  return '0.0.0';
}

function printHelp() {
  const help = `Flash CLI\n\n` +
    `Usage:\n` +
    `  Flash [options] [message]\n\n` +
    `Options:\n` +
    `  -h, --help       Show help\n` +
    `  -v, --version    Show version\n` +
    `  -i, --interactive Start simple interactive prompt\n` +
    `  -l, --local      Use local provider (Ollama via Genkit)\n` +
    `  -m, --model <m>  Override model name (provider-specific)\n\n` +
    `Examples:\n` +
    `  Flash --help\n` +
    `  Flash --version\n` +
    `  Flash "hello world"\n` +
    `  Flash -l -m gemma3n:e4b "offline test"\n` +
    `  Flash --interactive`;
  console.log(help);
}

async function interactivePrompt() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'flash> '
  });

  console.log('Welcome to Flash interactive mode. Type "help" or "exit".');
  rl.prompt();

  rl.on('line', (line) => {
    const input = line.trim();
    if (input === 'exit' || input === 'quit') {
      rl.close();
      return;
    }
    if (input === 'help') {
      console.log('Commands: help, exit');
    } else if (input.length > 0) {
      console.log(`You said: ${input}`);
    }
    rl.prompt();
  });

  await new Promise((resolve) => rl.on('close', resolve));
}

export async function main() {
  // Load .env early so Genkit can read GEMINI_API_KEY / GOOGLE_API_KEY
  loadEnv();
  const argv = process.argv.slice(2);
  const cfg = loadFlashConfig();
  if (argv.includes('-h') || argv.includes('--help')) {
    printHelp();
    return;
  }
  if (argv.includes('-v') || argv.includes('--version')) {
    console.log(getPackageVersion());
    return;
  }
  if (argv.includes('-i') || argv.includes('--interactive')) {
    await interactivePrompt();
    return;
  }

  // Parse flags: -l/--local and -m/--model
  let useLocal = argv.includes('-l') || argv.includes('--local');
  let modelOverride;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-m' || a === '--model') {
      modelOverride = argv[i + 1];
      argv.splice(i, 2);
      i--;
    } else if (a === '-l' || a === '--local') {
      argv.splice(i, 1);
      i--;
    }
  }

  const message = argv.join(' ').trim();
  if (message) {
    const provider = useLocal ? 'local' : (cfg.defaultProvider === 'local' ? 'local' : 'google');
    const model = modelOverride || (provider === 'local' ? cfg.localModel : cfg.googleModel);
    const temperature = cfg.temperature;
    const res = await runGenkitGenerate({ prompt: message, provider, model, temperature });
    if (res.ok) {
      console.log(res.text);
    } else {
      console.error(`[Flash] Genkit not ready: ${res.error}`);
      console.log(`Flash received: ${message}`);
      console.log('Tip: Install dependencies and build Genkit package:');
      console.log('  cd Flash/packages/genkit && npm install && npm run build');
      console.log('  Ensure GEMINI_API_KEY is set for Google provider.');
    }
  } else if (!process.stdin.isTTY) {
    // If input is piped, echo it.
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(Buffer.from(chunk));
    }
    const stdinText = Buffer.concat(chunks).toString('utf8').trim();
    if (stdinText.length > 0) {
      const provider = useLocal ? 'local' : (cfg.defaultProvider === 'local' ? 'local' : 'google');
      const model = modelOverride || (provider === 'local' ? cfg.localModel : cfg.googleModel);
      const temperature = cfg.temperature;
      const res = await runGenkitGenerate({ prompt: stdinText, provider, model, temperature });
      if (res.ok) {
        console.log(res.text);
      } else {
        console.error(`[Flash] Genkit not ready: ${res.error}`);
        console.log(`Flash received from stdin: ${stdinText}`);
      }
    } else {
      printHelp();
    }
  } else {
    printHelp();
  }
}
