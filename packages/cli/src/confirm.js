import readline from 'node:readline';
import { colorize } from './colors.js';

// Ask for user confirmation
export async function askConfirmation(message, defaultAnswer = false) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const defaultHint = defaultAnswer ? 'Y/n' : 'y/N';
  const question = `${message} (${defaultHint}): `;
  
  return new Promise((resolve) => {
    rl.question(colorize(question, 'yellow'), (answer) => {
      rl.close();
      
      const cleaned = answer.trim().toLowerCase();
      
      if (cleaned === '') {
        resolve(defaultAnswer);
      } else {
        resolve(cleaned === 'y' || cleaned === 'yes');
      }
    });
  });
}

// Confirm destructive command execution
export async function confirmDestructiveCommand(command, commandType = 'destructive') {
  console.log(colorize('\n⚠️  WARNING: Potentially destructive command detected!', 'red'));
  console.log(colorize('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'red'));
  console.log(colorize('Command to execute:', 'yellow'));
  console.log(colorize(`  ${command}`, 'brightRed'));
  console.log(colorize('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'red'));
  
  // Provide context-specific warnings
  if (command.includes('rm -rf')) {
    console.log(colorize('⚠️  This will permanently delete files and directories!', 'yellow'));
  } else if (command.includes('drop') || command.includes('truncate')) {
    console.log(colorize('⚠️  This will permanently delete database data!', 'yellow'));
  } else if (command.includes('git reset --hard')) {
    console.log(colorize('⚠️  This will discard all local changes!', 'yellow'));
  } else if (command.includes('force') || command.includes('-f')) {
    console.log(colorize('⚠️  This command uses force flag and may override safety checks!', 'yellow'));
  }
  
  console.log('');
  
  const confirmed = await askConfirmation('Do you want to proceed with this command?', false);
  
  if (!confirmed) {
    console.log(colorize('✅ Command cancelled by user', 'green'));
  }
  
  return confirmed;
}