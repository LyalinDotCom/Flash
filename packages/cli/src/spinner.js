// Simple loading spinner for Flash CLI
// Using ASCII characters for broad terminal compatibility

import { colorize } from './colors.js';

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const SPINNER_INTERVAL = 80; // milliseconds

export class Spinner {
  constructor(text = 'Loading') {
    this.text = text;
    this.frameIndex = 0;
    this.intervalId = null;
    this.stream = process.stdout;
  }

  start() {
    // Hide cursor
    this.stream.write('\x1B[?25l');
    
    this.intervalId = setInterval(() => {
      const frame = SPINNER_FRAMES[this.frameIndex];
      const message = `\r${colorize(frame, 'cyan')} ${this.text}`;
      
      // Clear the line and write the spinner
      this.stream.write('\x1B[2K' + message);
      
      this.frameIndex = (this.frameIndex + 1) % SPINNER_FRAMES.length;
    }, SPINNER_INTERVAL);
  }

  stop(finalMessage = null) {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    // Clear the line
    this.stream.write('\r\x1B[2K');
    
    // Show cursor
    this.stream.write('\x1B[?25h');
    
    // Print final message if provided
    if (finalMessage) {
      this.stream.write(finalMessage + '\n');
    }
  }

  update(text) {
    this.text = text;
  }
}

// Simple progress indicator for long operations
export function showProgress(message, promise) {
  const spinner = new Spinner(message);
  spinner.start();
  
  return promise
    .then(result => {
      spinner.stop();
      return result;
    })
    .catch(error => {
      spinner.stop();
      throw error;
    });
}