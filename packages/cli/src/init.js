import { 
  commandExists, 
  isOllamaRunning, 
  ollamaModelExists, 
  confirm, 
  runCommand,
  pullOllamaModel 
} from './utils.js';
import { applyGradient, colorize } from './colors.js';
import { askUser } from './interactive.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OLLAMA_INSTALL_URL = 'https://ollama.ai/install';
const DEFAULT_MODEL = 'gemma:2b'; // Using gemma:2b as gemma3n:e4b doesn't exist in Ollama registry

// Find or create .env file
async function findOrCreateEnvFile() {
  // First check current directory
  const cwdEnv = path.join(process.cwd(), '.env');
  if (fs.existsSync(cwdEnv)) {
    return cwdEnv;
  }
  
  // Then check Flash project root
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  let flashRoot = __dirname;
  
  // Navigate up to find Flash root (contains package.json with workspaces)
  for (let i = 0; i < 5; i++) {
    const pkgPath = path.join(flashRoot, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.workspaces) {
          // Found Flash root
          const envPath = path.join(flashRoot, '.env');
          return envPath;
        }
      } catch {}
    }
    const parent = path.dirname(flashRoot);
    if (parent === flashRoot) break;
    flashRoot = parent;
  }
  
  // Default to current directory
  return cwdEnv;
}

export async function runInit() {
  console.log(applyGradient('\n🚀 Flash Init - Setting up AI environment\n'));
  
  // Step 1: Check for Gemini API key
  console.log(colorize('Step 1: Checking for Gemini API key...', 'cyan'));
  const hasGeminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  
  if (!hasGeminiKey) {
    console.log(colorize('❌ No Gemini API key found.', 'red'));
    console.log('\nGemini API provides cloud-based AI with the latest models.');
    console.log('Get a free API key at: ' + colorize('https://makersuite.google.com/app/apikey', 'blue'));
    
    const wantsToSetKey = await confirm('\nWould you like to set up a Gemini API key now?');
    if (wantsToSetKey) {
      const apiKey = await askUser(colorize('Enter your Gemini API key: ', 'cyan'));
      
      if (apiKey && apiKey.trim()) {
        // Find or create .env file
        const envPath = await findOrCreateEnvFile();
        
        // Read existing .env content
        let envContent = '';
        if (fs.existsSync(envPath)) {
          envContent = fs.readFileSync(envPath, 'utf8');
        }
        
        // Check if GEMINI_API_KEY already exists
        if (envContent.includes('GEMINI_API_KEY=')) {
          // Update existing key
          envContent = envContent.replace(/GEMINI_API_KEY=.*$/m, `GEMINI_API_KEY=${apiKey.trim()}`);
        } else {
          // Add new key
          if (envContent && !envContent.endsWith('\n')) {
            envContent += '\n';
          }
          envContent += `GEMINI_API_KEY=${apiKey.trim()}\n`;
        }
        
        // Write updated content
        fs.writeFileSync(envPath, envContent);
        console.log(colorize('✅ Gemini API key saved to .env file!', 'green'));
        console.log('You can now use Flash with cloud AI (default mode).');
      } else {
        console.log(colorize('No key provided. You can add it later to .env file.', 'yellow'));
      }
    } else {
      console.log('\nYou can add it later by creating a .env file with:');
      console.log(colorize('GEMINI_API_KEY=your-key-here', 'green'));
    }
  } else {
    console.log(colorize('✅ Gemini API key is configured!', 'green'));
  }
  
  // Step 2: Check if Ollama is installed
  console.log(colorize('\nStep 2: Checking for Ollama installation...', 'cyan'));
  const hasOllama = await commandExists('ollama');
  
  if (!hasOllama) {
    console.log(colorize('❌ Ollama is not installed.', 'red'));
    console.log('\nOllama is required for running local AI models.');
    console.log(`Visit ${colorize(OLLAMA_INSTALL_URL, 'blue')} for installation instructions.`);
    
    if (process.platform === 'darwin') {
      console.log('\nFor macOS, you can install with:');
      console.log(colorize('  brew install ollama', 'green'));
    } else if (process.platform === 'linux') {
      console.log('\nFor Linux, you can install with:');
      console.log(colorize('  curl -fsSL https://ollama.ai/install.sh | sh', 'green'));
    }
    
    const shouldContinue = await confirm('\nWould you like to continue setup after installing Ollama?');
    if (!shouldContinue) {
      console.log('Setup cancelled. Run "flash --init" again after installing Ollama.');
      return;
    }
  } else {
    console.log(colorize('✅ Ollama is installed!', 'green'));
  }
  
  // Step 3: Check if Ollama is running
  console.log(colorize('\nStep 3: Checking if Ollama service is running...', 'cyan'));
  const ollamaRunning = await isOllamaRunning();
  
  if (!ollamaRunning) {
    console.log(colorize('❌ Ollama service is not running.', 'red'));
    console.log('\nTrying to start Ollama...');
    
    try {
      // Start Ollama in the background
      runCommand('ollama serve', true).catch(() => {}); // Ignore errors as it might already be starting
      
      // Wait a bit for Ollama to start
      console.log('Waiting for Ollama to start...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check again
      const isRunningNow = await isOllamaRunning();
      if (isRunningNow) {
        console.log(colorize('✅ Ollama service started successfully!', 'green'));
      } else {
        console.log(colorize('⚠️  Could not start Ollama automatically.', 'yellow'));
        console.log('Please start Ollama manually with: ' + colorize('ollama serve', 'green'));
        console.log('Then run "flash --init" again.');
        return;
      }
    } catch (error) {
      console.log(colorize('⚠️  Could not start Ollama automatically.', 'yellow'));
      console.log('Please start Ollama manually with: ' + colorize('ollama serve', 'green'));
      return;
    }
  } else {
    console.log(colorize('✅ Ollama service is running!', 'green'));
  }
  
  // Step 4: Check for default model
  console.log(colorize(`\nStep 4: Checking for default model (${DEFAULT_MODEL})...`, 'cyan'));
  const hasModel = await ollamaModelExists(DEFAULT_MODEL);
  
  if (!hasModel) {
    console.log(colorize(`❌ Model ${DEFAULT_MODEL} is not installed.`, 'red'));
    console.log(`\n${DEFAULT_MODEL} is a lightweight, fast model perfect for Flash.`);
    console.log('Download size: ~1.4GB');
    
    const shouldPull = await confirm(`\nWould you like to download ${DEFAULT_MODEL}?`);
    if (shouldPull) {
      const success = await pullOllamaModel(DEFAULT_MODEL);
      if (success) {
        console.log(colorize(`✅ Model ${DEFAULT_MODEL} installed successfully!`, 'green'));
      } else {
        console.log(colorize('❌ Failed to install model.', 'red'));
        console.log(`You can manually install it with: ${colorize(`ollama pull ${DEFAULT_MODEL}`, 'green')}`);
      }
    } else {
      console.log(`\nYou can install it later with: ${colorize(`ollama pull ${DEFAULT_MODEL}`, 'green')}`);
    }
  } else {
    console.log(colorize(`✅ Model ${DEFAULT_MODEL} is already installed!`, 'green'));
  }
  
  // Step 5: Test the setup
  console.log(colorize('\nStep 5: Testing local AI setup...', 'cyan'));
  console.log('Running a quick test with the local model...\n');
  
  try {
    const { runGenkitGenerate } = await import('./genkitRunner.js');
    const result = await runGenkitGenerate({
      prompt: 'Say "Hello from Flash!" in a cheerful way.',
      provider: 'local',
      model: DEFAULT_MODEL,
      temperature: 0.7
    });
    
    if (result.ok) {
      console.log(colorize('✅ Local AI is working!', 'green'));
      console.log(`\nResponse: ${result.text}`);
    } else {
      console.log(colorize('⚠️  Local AI test failed.', 'yellow'));
      console.log('Error:', result.error);
    }
  } catch (error) {
    console.log(colorize('⚠️  Could not test local AI.', 'yellow'));
    console.log('Make sure the Genkit package is built:');
    console.log(colorize('  cd Flash/packages/genkit && npm install && npm run build', 'green'));
  }
  
  // Final summary
  console.log(applyGradient('\n✨ Flash Init Complete!\n'));
  console.log('You can now use Flash:');
  if (hasGeminiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
    console.log(colorize('  flash "your prompt"', 'green') + '      - Use cloud AI (Gemini)');
  }
  console.log(colorize('  flash -l "your prompt"', 'green') + '   - Use local AI (Ollama)');
  console.log('\nFlash will automatically fall back to local mode when offline.');
  console.log('\nOther useful commands:');
  console.log('  ' + colorize('flash --doctor', 'cyan') + '       - Check system health');
  console.log('  ' + colorize('ollama list', 'cyan') + '          - See installed models');
  console.log('  ' + colorize('ollama pull <model>', 'cyan') + ' - Install other models');
  console.log('  ' + colorize('flash --help', 'cyan') + '         - See all Flash options');
}