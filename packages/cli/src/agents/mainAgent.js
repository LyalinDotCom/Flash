// Main Agent - Routes requests to appropriate sub-minds
import { formatSubMindsForPrompt, getSubMind } from './registry.js';
import { colorize } from '../colors.js';
import { Spinner } from '../spinner.js';

// Build the main agent's system prompt
export function buildMainAgentPrompt(baseSystemPrompt) {
  const subMindsInfo = formatSubMindsForPrompt();
  
  return `${baseSystemPrompt}

You are the Main Agent orchestrator. Your role is to:
1. Understand the user's request
2. Decide if you can answer directly or need to delegate to a sub-mind
3. If the request is ambiguous, ask for clarification
4. If a specialized task is needed, delegate to the appropriate sub-mind

${subMindsInfo}

Decision Guidelines:
- Answer directly for: general questions, explanations, simple calculations, advice
- Delegate to sub-minds for: specialized tasks that match their capabilities
- Ask for clarification when: the request is vague or could be interpreted multiple ways

Tool Usage:
To delegate to a sub-mind, use:
EXECUTE_SUBMIND: submind_id
REQUEST: The original user request to pass to the sub-mind

Example:
EXECUTE_SUBMIND: io
REQUEST: Save the list of planets to a file named planets.txt

Important:
- Only use EXECUTE_SUBMIND when you need a sub-mind's specialized capabilities
- Always pass the complete user request to the sub-mind
- Let the sub-mind handle the details of how to execute the task`;
}

// Parse sub-mind execution from response
export function parseSubMindExecution(response) {
  const match = response.match(/EXECUTE_SUBMIND:\s*(\w+)\s*\nREQUEST:\s*([\s\S]+?)(?:\n\n|$)/);
  if (match) {
    return {
      subMindId: match[1].trim(),
      request: match[2].trim()
    };
  }
  return null;
}

// Execute a sub-mind with the given request
export async function executeSubMind(subMindId, userRequest, generateFn, cfg) {
  const subMind = getSubMind(subMindId);
  if (!subMind) {
    return {
      success: false,
      error: `Sub-mind '${subMindId}' not found`
    };
  }
  
  // Fun visual feedback
  console.log('\n' + colorize('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan'));
  console.log(colorize('🧠 Main Agent:', 'brightCyan') + ' Analyzing request...');
  console.log(colorize(`🎯 Delegating to: ${subMind.name}`, 'brightGreen'));
  console.log(colorize('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan') + '\n');
  
  // Build the sub-mind's prompt
  const subMindPrompt = `${subMind.systemPrompt}\n\nUser Request: ${userRequest}`;
  
  // Use a spinner while the sub-mind processes
  const spinner = new Spinner(`🤖 ${subMind.name} is thinking...`);
  spinner.start();
  
  try {
    // Execute the sub-mind
    const result = await generateFn(subMindPrompt, 'google', cfg.googleModel, cfg.temperature, cfg);
    spinner.stop();
    
    if (result.ok) {
      console.log(colorize(`✅ ${subMind.name} completed successfully!\n`, 'green'));
      return {
        success: true,
        response: result.text,
        subMindName: subMind.name
      };
    } else {
      console.log(colorize(`❌ ${subMind.name} encountered an error`, 'red'));
      return {
        success: false,
        error: result.error
      };
    }
  } catch (error) {
    spinner.stop();
    console.log(colorize(`❌ ${subMind.name} encountered an error`, 'red'));
    return {
      success: false,
      error: error.message
    };
  }
}

// Check if response contains sub-mind execution
export function hasSubMindExecution(response) {
  return response.includes('EXECUTE_SUBMIND:');
}

// Remove sub-mind execution commands from response
export function removeSubMindCommands(response) {
  return response.replace(/EXECUTE_SUBMIND:\s*\w+\s*\nREQUEST:\s*[\s\S]+?(?:\n\n|$)/g, '').trim();
}