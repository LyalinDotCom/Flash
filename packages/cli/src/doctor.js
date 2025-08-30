import { 
  checkInternetConnection, 
  commandExists, 
  isOllamaRunning, 
  getOllamaModels 
} from './utils.js';
import { applyGradient, colorize } from './colors.js';
import { loadFlashConfig } from './config.js';
import { loadEnv } from './env.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function runDoctor() {
  console.log(applyGradient('\n🏥 Flash Doctor - System Health Check\n'));
  
  loadEnv();
  const cfg = loadFlashConfig();
  let healthScore = 0;
  let maxScore = 0;
  
  // System Information
  console.log(colorize('System Information:', 'cyan'));
  console.log(`  Platform: ${process.platform}`);
  console.log(`  Node.js: ${process.version}`);
  console.log(`  Flash Config: ${JSON.stringify(cfg, null, 2)}`);
  console.log('');
  
  // Check 1: Internet Connection
  console.log(colorize('1. Internet Connectivity', 'cyan'));
  maxScore++;
  const isOnline = await checkInternetConnection();
  if (isOnline) {
    console.log(colorize('  ✅ Internet connection available', 'green'));
    healthScore++;
  } else {
    console.log(colorize('  ❌ No internet connection detected', 'red'));
    console.log('     Flash will automatically use local mode');
  }
  console.log('');
  
  // Check 2: Cloud Provider (Gemini)
  console.log(colorize('2. Cloud Provider (Google Gemini)', 'cyan'));
  maxScore++;
  const hasGeminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (hasGeminiKey) {
    console.log(colorize('  ✅ API key configured', 'green'));
    console.log(`     Default model: ${cfg.googleModel}`);
    healthScore++;
  } else {
    console.log(colorize('  ❌ No API key found', 'red'));
    console.log('     Set GEMINI_API_KEY in .env file');
    console.log('     Get a free key at: https://makersuite.google.com/app/apikey');
  }
  console.log('');
  
  // Check 3: Ollama Installation
  console.log(colorize('3. Local Provider (Ollama)', 'cyan'));
  maxScore++;
  const hasOllama = await commandExists('ollama');
  let ollamaRunning = false;
  
  if (hasOllama) {
    console.log(colorize('  ✅ Ollama is installed', 'green'));
    healthScore++;
    
    // Check if Ollama is running
    ollamaRunning = await isOllamaRunning();
    maxScore++;
    if (ollamaRunning) {
      console.log(colorize('  ✅ Ollama service is running', 'green'));
      healthScore++;
      
      // List available models
      const models = await getOllamaModels();
      if (models.length > 0) {
        console.log(`     Available models: ${models.map(m => m.name).join(', ')}`);
        
        // Check for default model
        const defaultModel = cfg.localModel || 'gemma:2b';
        const hasDefaultModel = models.some(m => 
          m.name === defaultModel || m.name.startsWith(defaultModel + ':')
        );
        
        maxScore++;
        if (hasDefaultModel) {
          console.log(colorize(`  ✅ Default model (${defaultModel}) is installed`, 'green'));
          healthScore++;
        } else {
          console.log(colorize(`  ❌ Default model (${defaultModel}) not found`, 'red'));
          console.log(`     Run: ollama pull ${defaultModel}`);
        }
      } else {
        console.log(colorize('  ⚠️  No models installed', 'yellow'));
        console.log('     Run: flash --init');
      }
    } else {
      console.log(colorize('  ❌ Ollama service is not running', 'red'));
      console.log('     Start with: ollama serve');
    }
  } else {
    console.log(colorize('  ❌ Ollama is not installed', 'red'));
    console.log('     Install from: https://ollama.ai/download');
    console.log('     Or run: flash --init');
  }
  console.log('');
  
  // Check 4: Genkit Package
  console.log(colorize('4. Genkit Package', 'cyan'));
  maxScore++;
  
  // When running from bundle, we need to check relative to the project root
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  let genkitPath;
  
  // Check if we're running from bundle or source
  if (currentDir.includes('/bundle')) {
    // Running from bundle, go up to Flash root then to packages/genkit
    genkitPath = path.resolve(currentDir, '../packages/genkit/dist/index.js');
  } else {
    // Running from source
    genkitPath = path.resolve(currentDir, '../../genkit/dist/index.js');
  }
  
  const genkitBuilt = fs.existsSync(genkitPath);
  
  if (genkitBuilt) {
    console.log(colorize('  ✅ Genkit package is built', 'green'));
    healthScore++;
  } else {
    console.log(colorize('  ❌ Genkit package needs building', 'red'));
    console.log('     Run: cd Flash/packages/genkit && npm install && npm run build');
  }
  console.log('');
  
  // Check 5: Default Provider Selection
  console.log(colorize('5. Provider Selection', 'cyan'));
  let selectedProvider = cfg.defaultProvider || 'google';
  let selectedModel = '';
  
  // Determine which provider will be used
  if (!isOnline && selectedProvider === 'google') {
    selectedProvider = 'local';
    console.log(colorize('  ⚠️  Offline mode - will use local provider', 'yellow'));
  } else if (selectedProvider === 'google' && !hasGeminiKey) {
    selectedProvider = 'local';
    console.log(colorize('  ⚠️  No API key - will fallback to local provider', 'yellow'));
  }
  
  if (selectedProvider === 'google') {
    selectedModel = cfg.googleModel || 'gemini-2.0-flash-exp';
    console.log(colorize(`  ✅ Will use: Google Gemini (${selectedModel})`, 'green'));
  } else {
    selectedModel = cfg.localModel || 'gemma:2b';
    console.log(colorize(`  ✅ Will use: Local Ollama (${selectedModel})`, 'green'));
  }
  console.log('');
  
  // Overall Health Summary
  console.log(colorize('Health Summary:', 'cyan'));
  const percentage = Math.round((healthScore / maxScore) * 100);
  const status = percentage >= 80 ? '✅ Excellent' : 
                 percentage >= 60 ? '⚠️  Good' : 
                 percentage >= 40 ? '⚠️  Fair' : 
                 '❌ Needs Attention';
  
  console.log(`  Overall Health: ${status} (${healthScore}/${maxScore} checks passed)`);
  console.log('');
  
  if (percentage < 100) {
    console.log(colorize('Recommended Actions:', 'yellow'));
    if (!isOnline) {
      console.log('  - Check your internet connection for cloud features');
    }
    if (!hasGeminiKey) {
      console.log('  - Add GEMINI_API_KEY to .env for cloud mode');
    }
    if (!hasOllama || !ollamaRunning) {
      console.log('  - Run "flash --init" to set up local AI');
    }
    if (!genkitBuilt) {
      console.log('  - Build the Genkit package for AI functionality');
    }
  } else {
    console.log(colorize('🎉 Everything is working perfectly!', 'green'));
  }
  
  console.log('\nRun "flash --help" to see all available commands.');
}