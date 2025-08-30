import { execa } from 'execa';
import { colorize } from './colors.js';
import path from 'node:path';
import { analyzeIfWaitingForInput } from './agents/analysisExecutor.js';
import { runGenkitGenerate } from './genkitRunner.js';
import { confirmDestructiveCommand } from './confirm.js';

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
  // Check if marked as destructive
  const isDestructive = text.includes('DESTRUCTIVE_COMMAND: true');
  
  const match = text.match(/EXECUTE_COMMAND:\s*\nCOMMAND:\s*(.+?)(?:\nWORKING_DIR:\s*(.+?))?(?:\nCHECK_FIRST:\s*(.+?))?\s*\nEND_EXECUTE/s);
  
  if (!match) return null;
  
  return {
    command: match[1].trim(),
    workingDir: match[2]?.trim(),
    checkFirst: match[3]?.trim(),
    isDestructive
  };
}

// Interactive prompt detection patterns
const INTERACTIVE_PATTERNS = {
  // Direct prompts asking for input
  directPrompts: [
    /\?\s*$/m,                           // Question ending with ?
    /:\s*$/m,                            // Colon prompt (password:, username:)
    />\s*$/m,                            // Shell-like prompt
    /›\s*$/m,                            // Arrow prompt
    /\$\s*$/m,                           // Dollar prompt
    /#\s*$/m,                            // Hash prompt
  ],
  
  // Yes/No confirmation prompts
  confirmationPrompts: [
    /\(y\/n\)/i,
    /\(yes\/no\)/i,
    /\(y\/N\)/,
    /\(Y\/n\)/,
    /\[y\/n\]/i,
    /\[yes\/no\]/i,
    /continue\?/i,
    /proceed\?/i,
  ],
  
  // Password/credential prompts
  credentialPrompts: [
    /password\s*:\s*$/i,
    /username\s*:\s*$/i,
    /login\s*:\s*$/i,
    /token\s*:\s*$/i,
    /passphrase\s*:\s*$/i,
    /enter\s+password/i,
    /enter\s+username/i,
  ],
  
  // Selection prompts
  selectionPrompts: [
    /select\s+an?\s+option/i,
    /choose\s+an?\s+option/i,
    /please\s+select/i,
    /which\s+option/i,
    /\[\d+\]/,                           // Numbered options [1], [2], etc.
    /\d+\)\s*$/m,                        // Numbered list items ending line
  ],
  
  // Input field prompts
  inputPrompts: [
    /enter\s+.+:\s*$/i,
    /input\s+.+:\s*$/i,
    /provide\s+.+:\s*$/i,
    /type\s+.+:\s*$/i,
  ]
};

// Patterns that indicate legitimate long-running operations
const LONG_RUNNING_PATTERNS = [
  // Progress indicators
  /\d+%/,                               // Percentage progress
  /\[\s*[#=\-.*]+\s*\]/,               // Progress bars
  /\d+\/\d+/,                          // X/Y progress
  /\d+\s+of\s+\d+/,                    // X of Y progress
  
  // Time/speed indicators
  /\d+[a-z]*\/s/,                      // Speed indicators (MB/s, items/s)
  /ETA:\s*\d+/i,                       // Estimated time remaining
  /elapsed:/i,                         // Elapsed time
  /remaining:/i,                       // Time remaining
  
  // Processing indicators
  /processing\.\.\./i,
  /downloading\.\.\./i,
  /uploading\.\.\./i,
  /building\.\.\./i,
  /compiling\.\.\./i,
  /installing\.\.\./i,
  /running\.\.\./i,
  
  // Log streaming patterns
  /\d{4}-\d{2}-\d{2}/,                 // Date timestamps
  /\d{2}:\d{2}:\d{2}/,                 // Time timestamps
  /\[(INFO|DEBUG|WARN|ERROR)\]/i,      // Log levels
  /\[\d{4}-\d{2}-\d{2}.*?\]/,         // Timestamped logs
];


// Fallback pattern detection (simplified)
function isInteractivePromptFallback(output) {
  const interactiveIndicators = [
    /\?\s*$/m,
    /›/,
    /\(y\/n\)/i,
    /Select.*:/i,
    /Choose.*:/i,
  ];
  
  return interactiveIndicators.some(pattern => pattern.test(output));
}

// Check if output indicates a long-running operation
function isLongRunningOperation(output) {
  const recentOutput = output.slice(-500); // Check last 500 characters
  
  for (const pattern of LONG_RUNNING_PATTERNS) {
    if (pattern.test(recentOutput)) {
      return true;
    }
  }
  
  return false;
}

// Check if output has been actively updating
function hasRecentActivity(outputHistory, timeWindow = 5000) {
  if (outputHistory.length < 2) return false;
  
  const now = Date.now();
  const recentEntries = outputHistory.filter(entry => 
    now - entry.timestamp < timeWindow
  );
  
  return recentEntries.length > 1;
}

// Execute a command with live streaming
export async function executeCommandLive(command, options = {}) {
  const { workingDir, checkFirst, skipConfirmation = false, config = {} } = options;
  
  // Check if command is destructive and needs confirmation
  const confirmEnabled = config.confirmDestructiveCommands !== false;
  if (!skipConfirmation && confirmEnabled && isDestructiveCommand(command)) {
    const confirmed = await confirmDestructiveCommand(command);
    if (!confirmed) {
      return {
        success: false,
        error: 'Command cancelled by user',
        cancelled: true
      };
    }
  }
  
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
    
    let isWaitingForInput = false;
    let outputBuffer = '';
    let outputHistory = []; // Track output timing for activity detection
    let lastOutputTime = Date.now();
    
    // Set up intelligent interactive detection
    let inactivityTimer = null;
    const resetInactivityTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      
      inactivityTimer = setTimeout(async () => {
        const now = Date.now();
        const timeSinceLastOutput = now - lastOutputTime;
        
        // Only check if there's been no output for at least 3 seconds
        if (timeSinceLastOutput < 3000) {
          resetInactivityTimer();
          return;
        }
        
        // Use AI analysis agent
        const generateFn = async (prompt, provider, model, temp) => {
          return runGenkitGenerate({ prompt, provider, model, temperature: temp });
        };
        
        const isWaiting = await analyzeIfWaitingForInput(outputBuffer, timeSinceLastOutput, generateFn);
        
        if (isWaiting) {
          // AI determined it's waiting for input - terminate
          isWaitingForInput = true;
          subprocess.kill('SIGINT');
          // Don't print here - let the completion handler print once
        } else {
          // Not waiting for input - continue monitoring
          // But only check periodically to avoid too many AI calls
          setTimeout(() => {
            if (!isWaitingForInput && subprocess.exitCode === null) {
              resetInactivityTimer();
            }
          }, 5000); // Check again in 5 seconds
        }
      }, 4000); // Initial check after 4 seconds of inactivity
    };
    
    // Track output for activity detection
    const trackOutput = (data, source) => {
      const timestamp = Date.now();
      const content = data.toString();
      
      outputBuffer += content;
      outputHistory.push({ timestamp, content, source });
      lastOutputTime = timestamp;
      
      // Keep only recent history (last 2 minutes)
      outputHistory = outputHistory.filter(entry => 
        timestamp - entry.timestamp < 120000
      );
      
      resetInactivityTimer();
    };
    
    // Stream stdout
    subprocess.stdout.on('data', (data) => {
      process.stdout.write(data);
      trackOutput(data, 'stdout');
    });
    
    // Stream stderr
    subprocess.stderr.on('data', (data) => {
      process.stderr.write(data);
      trackOutput(data, 'stderr');
    });
    
    // Start the inactivity timer
    resetInactivityTimer();
    
    // Wait for completion
    const result = await subprocess;
    
    // Clear the timer
    if (inactivityTimer) clearTimeout(inactivityTimer);
    
    if (isWaitingForInput) {
      // Return with interactive flag - let the executor handle the messaging
      return {
        success: false,
        isInteractive: true,
        error: 'Command requires interactive input',
        stdout: outputBuffer,
        stderr: ''
      };
    }
    
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
    // Clear timer on error
    if (inactivityTimer) clearTimeout(inactivityTimer);
    
    if (isWaitingForInput) {
      // Return with interactive flag - let the executor handle the messaging
      return {
        success: false,
        isInteractive: true,
        error: 'Command requires interactive input',
        stdout: outputBuffer,
        stderr: ''
      };
    }
    
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

// Patterns for destructive commands
const DESTRUCTIVE_PATTERNS = [
  // File/directory removal
  /\brm\s+-rf?\b/i,
  /\brm\s+.*\*/,              // rm with wildcards
  /\brmdir\b/i,
  /\bdel\s+\/[sf]\b/i,        // Windows del /s or /f
  /\brd\s+\/s\b/i,            // Windows rd /s
  
  // Database operations
  /\bdrop\s+(database|table|schema)\b/i,
  /\btruncate\b/i,
  /\bdelete\s+from\b/i,
  
  // Git destructive operations
  /\bgit\s+reset\s+--hard\b/i,
  /\bgit\s+clean\s+-[fd]+/i,
  /\bgit\s+push\s+.*--force\b/i,
  /\bgit\s+push\s+.*-f\b/i,
  
  // Package operations
  /\bnpm\s+uninstall\b/i,
  /\byarn\s+remove\b/i,
  /\bpnpm\s+remove\b/i,
  
  // System operations
  /\bkill\s+-9\b/i,
  /\bkillall\b/i,
  /\bpkill\b/i,
  /\bformat\b/i,
  /\bmkfs\b/i,
  
  // Docker operations
  /\bdocker\s+.*prune.*-a\b/i,
  /\bdocker\s+rm\s+.*-f\b/i,
  /\bdocker\s+rmi\s+.*-f\b/i,
];

// Check if a command is potentially destructive
export function isDestructiveCommand(command) {
  const lowerCommand = command.toLowerCase();
  
  // Check against destructive patterns
  for (const pattern of DESTRUCTIVE_PATTERNS) {
    if (pattern.test(lowerCommand)) {
      return true;
    }
  }
  
  // Additional checks for commands with sudo
  if (lowerCommand.includes('sudo') && 
      (lowerCommand.includes('rm') || 
       lowerCommand.includes('delete') || 
       lowerCommand.includes('format'))) {
    return true;
  }
  
  return false;
}