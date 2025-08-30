import { 
  commandExists, 
  isOllamaRunning, 
  ollamaModelExists, 
  confirm, 
  runCommand,
  pullOllamaModel 
} from './utils.js';
import { applyGradient, colorize } from './colors.js';

const OLLAMA_INSTALL_URL = 'https://ollama.ai/install';
const DEFAULT_MODEL = 'gemma:2b'; // Using gemma:2b as gemma3n:e4b doesn't exist in Ollama registry

export async function runInit() {
  console.log(applyGradient('\n🚀 Flash Init - Setting up your local AI environment\n'));
  
  // Step 1: Check if Ollama is installed
  console.log(colorize('Step 1: Checking for Ollama installation...', 'cyan'));
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
  
  // Step 2: Check if Ollama is running
  console.log(colorize('\nStep 2: Checking if Ollama service is running...', 'cyan'));
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
  
  // Step 3: Check for default model
  console.log(colorize(`\nStep 3: Checking for default model (${DEFAULT_MODEL})...`, 'cyan'));
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
  
  // Step 4: Test the setup
  console.log(colorize('\nStep 4: Testing local AI setup...', 'cyan'));
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
  console.log('You can now use Flash with local AI:');
  console.log(colorize('  flash -l "your prompt here"', 'green'));
  console.log('\nFlash will automatically fall back to local mode when offline.');
  console.log('\nOther useful commands:');
  console.log('  ' + colorize('ollama list', 'cyan') + '           - See installed models');
  console.log('  ' + colorize('ollama pull <model>', 'cyan') + '  - Install other models');
  console.log('  ' + colorize('flash --help', 'cyan') + '          - See all Flash options');
}