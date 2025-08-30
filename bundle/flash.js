#!/usr/bin/env node
// Generated minimal bundle for Flash CLI
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
import { handleClarification, needsClarification } from './interactive.js';
import { 
  hasToolCalls, 
  parseToolCalls, 
  executeTools, 
  removeToolCalls 
} from './fileTools.js';
import { registerIOSubMind } from './agents/ioSubMind.js';
import { registerImageSubMind } from './agents/imageSubMind.js';
import { registerCLISubMind } from './agents/cliSubMind.js';
import { 
  buildMainAgentPrompt, 
  parseSubMindExecution, 
  executeSubMind, 
  hasSubMindExecution,
  removeSubMindCommands
} from './agents/mainAgent.js';
import {
  hasCommandExecution,
  parseCommandExecution,
  executeCommandLive,
  removeCommandBlocks
} from './cliTools.js';
import {
  hasImageGeneration,
  hasImageWrite,
  parseImageGeneration,
  parseImageWrite,
  generateImage,
  writeImageFromBase64,
  removeImageCommands
} from './imageTools.js';

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
  const help = `Flash CLI - Multi-Agent AI Assistant\n\n` +
    `Usage:\n` +
    `  Flash [options] [message]\n` +
    `  Flash .          Enter multiline mode (press Enter twice to submit)\n\n` +
    `Options:\n` +
    `  -h, --help       Show help\n` +
    `  -v, --version    Show version\n` +
    `  -i, --interactive Start simple interactive prompt\n` +
    `  -l, --local      Use local provider (Ollama via Genkit)\n` +
    `  -m, --model <m>  Override model name (provider-specific)\n` +
    `  --init           Setup local AI (install Ollama & models)\n` +
    `  --doctor         Check system health and configuration\n` +
    `  --show-system-prompt  Output the computed system prompt and exit\n\n` +
    `Features:\n` +
    `  • Multi-Agent System (Gemini): Automatically delegates specialized tasks\n` +
    `  • CLI Assistant: Execute terminal commands using natural language\n` +
    `  • Image Generation: Create images from prompts, combine source images\n` +
    `  • File Operations: Read/write files and images in current directory\n` +
    `  • Smart Clarifications: Asks for details when requests are ambiguous\n` +
    `  • Auto-Fallback: Switches to local mode when offline\n\n` +
    `Examples:\n` +
    `  Flash --help\n` +
    `  Flash --version\n` +
    `  Flash --init     # Setup local AI\n` +
    `  Flash "list US states"               # Direct response\n` +
    `  Flash "save US states to file"       # Delegates to I/O agent\n` +
    `  Flash "generate a sunset image"      # Delegates to Image agent\n` +
    `  Flash "combine photo1.png photo2.png" # Image agent combines images\n` +
    `  Flash "deploy to firebase"           # Delegates to CLI agent\n` +
    `  Flash "run the build process"        # CLI agent executes build\n` +
    `  Flash -l "offline test"\n` +
    `  Flash .                              # Multiline input mode\n` +
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
    '  flash .                       # multiline mode (press Enter twice to submit)',
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

async function getMultilineInput() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log(colorize('\n📝 Enter your prompt (press Enter twice to submit):\n', 'cyan'));
  
  const lines = [];
  let emptyLineCount = 0;
  
  return new Promise((resolve) => {
    rl.on('line', (line) => {
      if (line.trim() === '') {
        emptyLineCount++;
        if (emptyLineCount >= 1) {
          rl.close();
          resolve(lines.join('\n').trim());
        }
      } else {
        emptyLineCount = 0;
        lines.push(line);
      }
    });
  });
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

// Handle multi-agent execution for Gemini
async function handleMultiAgent(response, userMessage, provider, model, temperature, cfg) {
  // Check if main agent wants to execute a sub-mind
  if (hasSubMindExecution(response)) {
    const execution = parseSubMindExecution(response);
    if (execution) {
      // Execute the sub-mind
      const result = await executeSubMind(
        execution.subMindId, 
        execution.request,
        async (prompt, provider, model, temp, config) => {
          // This function will be called by the sub-mind to generate its response
          const { res } = await generateWithFallback(prompt, provider, model, temp, config);
          return res;
        },
        cfg
      );
      
      if (result.success) {
        // Handle any tools the sub-mind might have used
        return await handleToolsAndGenerate(result.response, '', userMessage, provider, model, temperature, cfg);
      } else {
        return `Error executing sub-mind: ${result.error}`;
      }
    }
  }
  
  // No sub-mind execution, check for main agent's direct response
  const cleanResponse = removeSubMindCommands(response);
  return cleanResponse;
}

// Handle tool execution and provide simple feedback
async function handleToolsAndGenerate(response, sysPrompt, userMessage, provider, model, temperature, cfg) {
  let processedResponse = response;
  let feedback = '';
  
  // Check for image generation
  if (hasImageGeneration(processedResponse)) {
    const imageGen = parseImageGeneration(processedResponse);
    if (imageGen) {
      const spinner = new Spinner('🎨 Generating image...');
      spinner.start();
      
      const result = await generateImage(imageGen.prompt, imageGen.sourceFiles, cfg);
      spinner.stop();
      
      if (result.success) {
        // Auto-save the generated image
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const outputFilename = `generated_image_${timestamp}.png`;
        
        try {
          writeImageFromBase64(outputFilename, result.imageData);
          feedback += `\n✅ Generated image saved as: ${outputFilename}`;
          if (result.text) {
            feedback += `\n${result.text}`;
          }
        } catch (error) {
          feedback += `\n❌ Failed to save image: ${error.message}`;
        }
      } else {
        feedback += `\n❌ Image generation failed: ${result.error}`;
      }
      
      processedResponse = removeImageCommands(processedResponse);
    }
  }
  
  // Check for image write
  if (hasImageWrite(processedResponse)) {
    const imageWrite = parseImageWrite(processedResponse);
    if (imageWrite) {
      try {
        writeImageFromBase64(imageWrite.filename, imageWrite.base64Data);
        feedback += `\n✅ Image saved as: ${imageWrite.filename}`;
      } catch (error) {
        feedback += `\n❌ Failed to save image: ${error.message}`;
      }
      
      processedResponse = removeImageCommands(processedResponse);
    }
  }
  
  // Check for command execution
  if (hasCommandExecution(processedResponse)) {
    const cmdExec = parseCommandExecution(processedResponse);
    if (cmdExec) {
      const result = await executeCommandLive(cmdExec.command, {
        workingDir: cmdExec.workingDir,
        checkFirst: cmdExec.checkFirst
      });
      
      if (!result.success) {
        feedback += `\n❌ Command execution failed: ${result.error}`;
      }
      
      processedResponse = removeCommandBlocks(processedResponse);
    }
  }
  
  // Check if response contains file tool calls
  if (hasToolCalls(processedResponse)) {
    // Parse and execute tools
    const toolCalls = parseToolCalls(processedResponse);
    const toolResults = await executeTools(toolCalls);
    
    // Get the clean response without tool calls
    processedResponse = removeToolCalls(processedResponse);
    
    // Add feedback for file operations
    for (const result of toolResults) {
      if (result.tool === 'read') {
        if (result.content) {
          feedback += `\nRead file: ${result.filename}\n${result.content}`;
        }
      } else if (result.tool === 'write') {
        if (result.success) {
          feedback += `\n✅ Created file: ${result.filename}`;
        }
      }
    }
  }
  
  // Return clean response with any feedback
  if (processedResponse.trim()) {
    return processedResponse + (feedback ? `\n${feedback}` : '');
  }
  
  return feedback || 'Operation completed.';
}

export async function main() {
  // Load .env early so Genkit can read GEMINI_API_KEY / GOOGLE_API_KEY
  loadEnv();
  
  // Register sub-minds
  registerIOSubMind();
  registerImageSubMind();
  registerCLISubMind();
  
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

  let message = argv.join(' ').trim();
  let provider = useLocal ? 'local' : (cfg.defaultProvider === 'local' ? 'local' : 'google');
  let model = modelOverride || (provider === 'local' ? cfg.localModel : cfg.googleModel);
  const temperature = cfg.temperature;

  // Check for multiline mode
  if (message === '.') {
    message = await getMultilineInput();
    if (!message) {
      console.log(colorize('No input provided. Exiting.', 'yellow'));
      return;
    }
  }

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
    
    // Build appropriate system prompt based on provider
    let sysPrompt;
    let finalPrompt;
    
    if (provider === 'google') {
      // For Gemini, use the main agent system prompt
      const basePrompt = await buildSystemPrompt({ provider, model, cliVersion: getPackageVersion(), isMainAgent: true });
      sysPrompt = buildMainAgentPrompt(basePrompt);
      finalPrompt = `${sysPrompt}\n\nUser: ${message}`;
    } else {
      // For local mode, use the regular system prompt with file tools
      sysPrompt = await buildSystemPrompt({ provider, model, cliVersion: getPackageVersion() });
      finalPrompt = `${sysPrompt}\n\nUser: ${message}`;
    }

    const { res, provider: usedProvider, model: usedModel } = await generateWithFallback(
      finalPrompt, provider, model, temperature, cfg
    );
    
    if (res.ok) {
      // Check if clarification is needed
      if (needsClarification(res.text)) {
        // Create a function to generate follow-up responses
        const generateFollowUp = async (additionalContext) => {
          const updatedPrompt = `${sysPrompt}\n\nUser: ${message}${additionalContext}`;
          const result = await generateWithFallback(
            updatedPrompt, usedProvider, usedModel, temperature, cfg
          );
          return result.res;
        };
        
        // Handle the clarification flow
        const clarifiedResponse = await handleClarification(res.text, generateFollowUp);
        if (clarifiedResponse && clarifiedResponse.ok) {
          // Handle response based on provider
          let finalResponse;
          if (usedProvider === 'google') {
            // For Gemini, use multi-agent handling
            finalResponse = await handleMultiAgent(
              clarifiedResponse.text, message, usedProvider, usedModel, temperature, cfg
            );
          } else {
            // For local mode, use direct tool handling
            finalResponse = await handleToolsAndGenerate(
              clarifiedResponse.text, sysPrompt, message, usedProvider, usedModel, temperature, cfg
            );
          }
          console.log(finalResponse);
        }
      } else {
        // Handle response based on provider
        let finalResponse;
        if (usedProvider === 'google') {
          // For Gemini, use multi-agent handling
          finalResponse = await handleMultiAgent(
            res.text, message, usedProvider, usedModel, temperature, cfg
          );
        } else {
          // For local mode, use direct tool handling
          finalResponse = await handleToolsAndGenerate(
            res.text, sysPrompt, message, usedProvider, usedModel, temperature, cfg
          );
        }
        console.log(finalResponse);
      }
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
      
      const { res, provider: usedProvider, model: usedModel } = await generateWithFallback(
        finalPrompt, provider, model, temperature, cfg
      );
      
      if (res.ok) {
        // Check if clarification is needed
        if (needsClarification(res.text)) {
          // Create a function to generate follow-up responses
          const generateFollowUp = async (additionalContext) => {
            const updatedPrompt = `${sysPrompt}\n\nUser: ${stdinText}${additionalContext}`;
            const result = await generateWithFallback(
              updatedPrompt, usedProvider, usedModel, temperature, cfg
            );
            return result.res;
          };
          
          // Handle the clarification flow
          const clarifiedResponse = await handleClarification(res.text, generateFollowUp);
          if (clarifiedResponse && clarifiedResponse.ok) {
            // Handle tool calls in clarified response
            const finalResponse = await handleToolsAndGenerate(
              clarifiedResponse.text, sysPrompt, stdinText, usedProvider, usedModel, temperature, cfg
            );
            console.log(finalResponse);
          }
        } else {
          // Handle tool calls if present
          const finalResponse = await handleToolsAndGenerate(
            res.text, sysPrompt, stdinText, usedProvider, usedModel, temperature, cfg
          );
          console.log(finalResponse);
        }
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

// Entry runner

(async () => {
  try {
    await main();
    // Ensure clean exit
    process.exit(0);
  } catch (error) {
    const msg = error instanceof Error ? (error.stack ?? error.message) : String(error);
    console.error(msg);
    process.exit(1);
  }
})();
