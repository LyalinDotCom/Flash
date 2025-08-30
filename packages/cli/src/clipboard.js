import { execa } from 'execa';
import { colorize } from './colors.js';

// Copy text to clipboard based on platform
export async function copyToClipboard(text) {
  try {
    if (process.platform === 'darwin') {
      // macOS
      await execa('pbcopy', {
        input: text,
        stdin: 'pipe'
      });
      return true;
    } else if (process.platform === 'win32') {
      // Windows
      await execa('clip', {
        input: text,
        stdin: 'pipe'
      });
      return true;
    } else {
      // Linux - try xclip first, then xsel
      try {
        await execa('xclip', ['-selection', 'clipboard'], {
          input: text,
          stdin: 'pipe'
        });
        return true;
      } catch {
        try {
          await execa('xsel', ['--clipboard', '--input'], {
            input: text,
            stdin: 'pipe'
          });
          return true;
        } catch {
          // Neither xclip nor xsel available
          return false;
        }
      }
    }
  } catch (error) {
    // Clipboard command failed
    return false;
  }
}

// Safe clipboard copy with feedback
export async function safeCopyToClipboard(text, showFeedback = true) {
  const success = await copyToClipboard(text);
  
  if (success && showFeedback) {
    console.log(colorize('\n📋 ✅ Command copied to clipboard!', 'brightGreen'));
    
    // Show OS-specific paste instruction
    let pasteHint;
    if (process.platform === 'darwin') {
      pasteHint = 'You can paste it with Cmd+V';
    } else if (process.platform === 'win32') {
      pasteHint = 'You can paste it with Ctrl+V';
    } else {
      pasteHint = 'You can paste it with Ctrl+V';
    }
    
    console.log(colorize(`   ${pasteHint}`, 'gray'));
  }
  
  return success;
}