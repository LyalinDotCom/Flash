import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';
import { loadFlashConfig } from './config.js';
import { runGenkitGenerate } from './genkitRunner.js';
import { loadEnv } from './env.js';
import { buildSystemPrompt } from './systemPrompt.js';
import { shortFlashAscii, longFlashAscii, tinyFlashAscii, flashAscii } from './ascii.js';
import { applyGradient, colorize } from './colors.js';
import { checkInternetConnection, isOllamaRunning } from './utils.js';
import { runInit } from './init.js';
import { runDoctor } from './doctor.js';
import { Spinner } from './spinner.js';

function getAsciiArtWidth(ascii) {
  const lines = ascii.trim().split('\n');
  return Math.max(...lines.map(line => line.length));
}

function selectFlashAscii() {
  // Get terminal width from various sources
  const termWidth = process.stdout.columns || 
                   parseInt(process.env.COLUMNS) || 
                   80;
  
  const longWidth = getAsciiArtWidth(longFlashAscii);
  const shortWidth = getAsciiArtWidth(shortFlashAscii);
  
  if (termWidth >= longWidth + 5) { // Add some padding
    return longFlashAscii;
  } else if (termWidth >= shortWidth + 5) {
    return shortFlashAscii;
  } else {
    return tinyFlashAscii;
  }
}

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
    `  -m, --model <m>  Override model name (provider-specific)\n` +
    `  --init           Setup local AI (install Ollama & models)\n` +
    `  --doctor         Check system health and configuration\n` +
    `  --show-system-prompt  Output the computed system prompt and exit\n\n` +
    `Examples:\n` +
    `  Flash --help\n` +
    `  Flash --version\n` +
    `  Flash --init     # Setup local AI\n` +
    `  Flash "hello world"\n` +
    `  Flash -l "offline test"\n` +
    `  Flash --interactive`;
  console.log(help);
}

function printWelcome() {
  const intro = [
    '',
    'Flash helps with quick, simple terminal requests — and will do its best for more complex tasks.',
    'Works online with Gemini or offline with local AI. Automatically falls back when offline!',
    '',
    'Quick start:',
    '  flash "your request"          # uses cloud, falls back to local if offline',
    '  flash -l "your request"       # force local mode',
    '  flash --init                  # first-time setup for local AI',
    '  flash --doctor                # check system health',
    '  flash --help                  # all options',
    '',
  ].join('\n');

  console.log(applyGradient(selectFlashAscii()));
  console.log(intro);
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

// Generate with automatic fallback to local if online fails
async function generateWithFallback(finalPrompt, provider, model, temperature, cfg) {
  const spinner = new Spinner(`Thinking with ${provider === 'local' ? 'local AI' : 'Gemini'}...`);
  spinner.start();
  
  try {
    // Try the requested provider first
    let res = await runGenkitGenerate({ prompt: finalPrompt, provider, model, temperature });
    
    // If it failed and we're not already on local, try falling back to local
    if (!res.ok && provider !== 'local') {
      spinner.update('Switching to local AI...');
      
      // Check if Ollama is available
      const ollamaReady = await isOllamaRunning();
      if (ollamaReady) {
        provider = 'local';
        model = cfg.localModel;
        res = await runGenkitGenerate({ prompt: finalPrompt, provider, model, temperature });
        
        if (res.ok) {
          spinner.stop(colorize('✅ Using local AI\n', 'green'));
        } else {
          spinner.stop();
        }
      } else {
        spinner.stop();
        console.log(colorize('Local fallback unavailable - Ollama is not running.', 'yellow'));
        console.log('Run "flash --init" to set up local AI.');
      }
    } else {
      spinner.stop();
    }
    
    return { res, provider, model };
  } catch (error) {
    spinner.stop();
    throw error;
  }
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
  if (argv.includes('--init')) {
    await runInit();
    return;
  }
  if (argv.includes('--doctor')) {
    await runDoctor();
    return;
  }

  // Parse flags: -l/--local and -m/--model
  let useLocal = argv.includes('-l') || argv.includes('--local');
  let modelOverride;
  let showSystem = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-m' || a === '--model') {
      modelOverride = argv[i + 1];
      argv.splice(i, 2);
      i--;
    } else if (a === '-l' || a === '--local') {
      argv.splice(i, 1);
      i--;
    } else if (a === '--show-system' || a === '--show-system-prompt') {
      showSystem = true;
      argv.splice(i, 1);
      i--;
    }
  }

  const message = argv.join(' ').trim();
  let provider = useLocal ? 'local' : (cfg.defaultProvider === 'local' ? 'local' : 'google');
  let model = modelOverride || (provider === 'local' ? cfg.localModel : cfg.googleModel);
  const temperature = cfg.temperature;

  if (showSystem) {
    const sys = await buildSystemPrompt({ provider, model, cliVersion: getPackageVersion() });
    console.log(sys);
    return;
  }
  if (message) {
    // Check internet connectivity only when we need to generate
    if (!useLocal && provider === 'google') {
      const isOnline = await checkInternetConnection();
      if (!isOnline) {
        console.log(colorize('No internet connection detected. Switching to local mode...', 'yellow'));
        provider = 'local';
        model = modelOverride || cfg.localModel;
      }
    }
    
    const sysPrompt = await buildSystemPrompt({ provider, model, cliVersion: getPackageVersion() });
    const finalPrompt = `${sysPrompt}\n\nUser: ${message}`;

    const { res, provider: usedProvider, model: usedModel } = await generateWithFallback(
      finalPrompt, provider, model, temperature, cfg
    );
    
    if (res.ok) {
      console.log(res.text);
    } else {
      console.error(`[Flash] Generation failed: ${res.error}`);
      console.log(`\nTroubleshooting tips:`);
      if (usedProvider === 'local') {
        console.log('- Ensure Ollama is running: ' + colorize('ollama serve', 'cyan'));
        console.log('- Check installed models: ' + colorize('ollama list', 'cyan'));
        console.log('- Install default model: ' + colorize('flash --init', 'cyan'));
      } else {
        console.log('- Check your internet connection');
        console.log('- Ensure GEMINI_API_KEY is set');
        console.log('- Try local mode: ' + colorize('flash -l "your prompt"', 'cyan'));
      }
    }
  } else if (!process.stdin.isTTY) {
    // If input is piped, read it
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(Buffer.from(chunk));
    }
    const stdinText = Buffer.concat(chunks).toString('utf8').trim();
    if (stdinText.length > 0) {
      // Check internet connectivity only when we need to generate
      if (!useLocal && provider === 'google') {
        const isOnline = await checkInternetConnection();
        if (!isOnline) {
          console.log(colorize('No internet connection detected. Switching to local mode...', 'yellow'));
          provider = 'local';
          model = modelOverride || cfg.localModel;
        }
      }
      
      const sysPrompt = await buildSystemPrompt({ provider, model, cliVersion: getPackageVersion() });
      const finalPrompt = `${sysPrompt}\n\nUser: ${stdinText}`;
      
      const { res } = await generateWithFallback(
        finalPrompt, provider, model, temperature, cfg
      );
      
      if (res.ok) {
        console.log(res.text);
      } else {
        console.error(`[Flash] Generation failed: ${res.error}`);
      }
    } else {
      printWelcome();
    }
  } else {
    // No message and running in TTY - just show welcome
    printWelcome();
  }
}
