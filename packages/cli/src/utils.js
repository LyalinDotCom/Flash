import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import https from 'node:https';
import readline from 'node:readline';

const execAsync = promisify(exec);

// Check internet connectivity by trying to reach Google DNS
export async function checkInternetConnection() {
  return new Promise((resolve) => {
    https.get('https://dns.google', { timeout: 3000 }, (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => {
      resolve(false);
    }).on('timeout', () => {
      resolve(false);
    });
  });
}

// Check if a command exists in the system
export async function commandExists(command) {
  try {
    await execAsync(`which ${command}`);
    return true;
  } catch {
    return false;
  }
}

// Check if Ollama is running
export async function isOllamaRunning() {
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Get list of available Ollama models
export async function getOllamaModels() {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (!response.ok) return [];
    
    const data = await response.json();
    return data.models || [];
  } catch {
    return [];
  }
}

// Check if a specific model exists in Ollama
export async function ollamaModelExists(modelName) {
  const models = await getOllamaModels();
  return models.some(model => model.name === modelName || model.name.startsWith(modelName + ':'));
}

// Prompt user for confirmation
export async function confirm(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${question} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// Execute a command and stream output
export async function runCommand(command, silent = false) {
  return new Promise((resolve, reject) => {
    const child = exec(command);
    
    if (!silent) {
      child.stdout.on('data', (data) => process.stdout.write(data));
      child.stderr.on('data', (data) => process.stderr.write(data));
    }
    
    child.on('exit', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
  });
}

// Pull an Ollama model with progress
export async function pullOllamaModel(modelName) {
  console.log(`Pulling model ${modelName}...`);
  try {
    await runCommand(`ollama pull ${modelName}`);
    return true;
  } catch (error) {
    console.error(`Failed to pull model: ${error.message}`);
    return false;
  }
}