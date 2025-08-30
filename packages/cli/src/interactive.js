import readline from 'node:readline';
import { colorize } from './colors.js';

// Create a nice interactive prompt for clarifications
export function createInteractivePrompt() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: colorize('> ', 'cyan')
  });

  // Handle Ctrl-C gracefully
  rl.on('SIGINT', () => {
    console.log('\n' + colorize('Exiting Flash...', 'yellow'));
    process.exit(0);
  });

  return rl;
}

// Ask for user input with a styled prompt
export async function askUser(question) {
  const rl = createInteractivePrompt();
  
  return new Promise((resolve) => {
    // Display the question
    console.log('\n' + question);
    console.log(colorize('\nPress Ctrl-C to exit at any time.', 'gray'));
    
    // Show the prompt
    rl.prompt();
    
    rl.on('line', (input) => {
      rl.close();
      resolve(input.trim());
    });
  });
}

// Check if response needs clarification
export function needsClarification(response) {
  return response.startsWith('CLARIFICATION_NEEDED:');
}

// Extract the clarification question from the response
export function extractClarificationQuestion(response) {
  if (needsClarification(response)) {
    // Remove the marker and return the rest
    return response.replace('CLARIFICATION_NEEDED:', '').trim();
  }
  return response;
}

// Handle interactive clarification flow
export async function handleClarification(initialResponse, generateFn) {
  let response = initialResponse;
  let conversationHistory = '';
  
  while (needsClarification(response)) {
    // Extract and display the clarification question
    const question = extractClarificationQuestion(response);
    console.log('\n' + colorize('Flash needs clarification:', 'yellow'));
    console.log(question);
    
    // Get user input
    const userAnswer = await askUser('');
    
    if (!userAnswer) {
      console.log(colorize('No input provided. Exiting...', 'yellow'));
      return null;
    }
    
    // Add to conversation history
    conversationHistory += `\n\nAssistant: ${question}\n\nUser: ${userAnswer}`;
    
    // Generate new response with the clarification
    const newResponse = await generateFn(conversationHistory);
    
    if (!newResponse.ok) {
      return newResponse;
    }
    
    response = newResponse.text;
  }
  
  return { ok: true, text: response };
}