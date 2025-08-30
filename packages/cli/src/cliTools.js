import { execa } from 'execa';
import { colorize } from './colors.js';
import path from 'node:path';

// Check if a command exists
export async function commandExists(command) {
  try {
    await execa('which', [command]);
    return true;
  } catch {
    // Try Windows where command
    try {
      await execa('where', [command]);
      return true;
    } catch {
      return false;
    }
  }
}

// Parse EXECUTE_COMMAND blocks
export function parseCommandExecution(text) {
  const match = text.match(/EXECUTE_COMMAND:\s*\nCOMMAND:\s*(.+?)(?:\nWORKING_DIR:\s*(.+?))?(?:\nCHECK_FIRST:\s*(.+?))?\s*\nEND_EXECUTE/s);
  
  if (!match) return null;
  
  return {
    command: match[1].trim(),
    workingDir: match[2]?.trim(),
    checkFirst: match[3]?.trim()
  };
}

// Execute a command with live streaming
export async function executeCommandLive(command, options = {}) {
  const { workingDir, checkFirst } = options;
  
  console.log(colorize('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan'));
  console.log(colorize('🖥️  CLI Assistant:', 'brightCyan') + ' Executing command');
  console.log(colorize('📂 Directory:', 'yellow') + ' ' + (workingDir || process.cwd()));
  console.log(colorize('⚡ Command:', 'green') + ' ' + command);
  console.log(colorize('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan') + '\n');
  
  // Run prerequisite check if provided
  if (checkFirst) {
    console.log(colorize('🔍 Running prerequisite check: ' + checkFirst, 'yellow'));
    try {
      const checkResult = await execa(checkFirst, {
        shell: true,
        cwd: workingDir
      });
      console.log(colorize('✅ Prerequisite check passed', 'green'));
      console.log(''); // Add spacing
    } catch (error) {
      console.log(colorize('❌ Prerequisite check failed', 'red'));
      return {
        success: false,
        error: `Prerequisite check failed: ${error.message}`,
        exitCode: error.exitCode
      };
    }
  }
  
  try {
    // Parse command and args
    const [cmd, ...args] = command.split(' ');
    
    // Execute with live streaming
    const subprocess = execa(cmd, args, {
      cwd: workingDir,
      stdio: 'pipe',
      shell: true
    });
    
    // Stream stdout
    subprocess.stdout.on('data', (data) => {
      process.stdout.write(data);
    });
    
    // Stream stderr
    subprocess.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
    
    // Wait for completion
    const result = await subprocess;
    
    console.log(colorize('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan'));
    console.log(colorize('✅ Command completed successfully', 'green'));
    console.log(colorize('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan'));
    
    return {
      success: true,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr
    };
  } catch (error) {
    console.log(colorize('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'red'));
    console.log(colorize('❌ Command failed', 'red'));
    console.log(colorize(`Exit code: ${error.exitCode}`, 'red'));
    console.log(colorize('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'red'));
    
    return {
      success: false,
      error: error.message,
      exitCode: error.exitCode,
      stdout: error.stdout,
      stderr: error.stderr
    };
  }
}

// Check if response contains command execution
export function hasCommandExecution(text) {
  return text.includes('EXECUTE_COMMAND:');
}

// Remove command execution blocks from response
export function removeCommandBlocks(text) {
  return text.replace(/EXECUTE_COMMAND:[\s\S]*?END_EXECUTE/g, '').trim();
}

// Smart command detection patterns
export const COMMAND_PATTERNS = {
  deploy: /deploy|publish|release/i,
  build: /build|compile|bundle/i,
  test: /test|spec|jest|mocha|vitest/i,
  install: /install|add|npm i|yarn add|pnpm add/i,
  start: /start|run|serve|dev/i,
  git: /git|commit|push|pull|merge|branch/i,
  docker: /docker|container|image/i,
  database: /database|db|migrate|seed/i,
  lint: /lint|eslint|prettier|format/i,
  clean: /clean|clear|remove|delete/i
};

// Detect command type from user input
export function detectCommandType(input) {
  const lowercaseInput = input.toLowerCase();
  
  for (const [type, pattern] of Object.entries(COMMAND_PATTERNS)) {
    if (pattern.test(lowercaseInput)) {
      return type;
    }
  }
  
  return 'general';
}