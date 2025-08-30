// Simple color support for Flash CLI ASCII art
// Inspired by Gemini CLI's gradient implementation

const ANSI_CODES = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // Bright foreground colors
  brightBlack: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
};

// Check if terminal supports colors
function supportsColor() {
  // Basic check for color support
  if (process.env.NO_COLOR) return false;
  if (process.env.FORCE_COLOR) return true;
  if (process.platform === 'win32') return true;
  if (process.env.TERM === 'dumb') return false;
  if (!process.stdout.isTTY) return false;
  return true;
}

// Simple gradient effect for ASCII art
// Uses blue -> purple -> pink gradient similar to Gemini
export function applyGradient(text) {
  if (!supportsColor()) {
    return text;
  }
  
  const lines = text.split('\n');
  const gradientColors = [
    ANSI_CODES.brightBlue,    // Bright blue
    ANSI_CODES.blue,           // Blue
    ANSI_CODES.magenta,        // Purple/Magenta
    ANSI_CODES.brightMagenta,  // Bright purple/magenta
    ANSI_CODES.brightRed,      // Pink-ish (bright red)
  ];
  
  return lines.map((line, lineIndex) => {
    if (line.trim() === '') return line;
    
    // Calculate which color to use based on line position
    const colorIndex = Math.floor((lineIndex / lines.length) * gradientColors.length);
    const color = gradientColors[Math.min(colorIndex, gradientColors.length - 1)];
    
    return color + line + ANSI_CODES.reset;
  }).join('\n');
}

// Apply a single color to text
export function colorize(text, colorName) {
  if (!supportsColor() || !ANSI_CODES[colorName]) {
    return text;
  }
  return ANSI_CODES[colorName] + text + ANSI_CODES.reset;
}