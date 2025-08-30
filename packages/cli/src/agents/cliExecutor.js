import { colorize } from '../colors.js';
import { Spinner } from '../spinner.js';
import { 
  hasCommandExecution, 
  parseCommandExecution, 
  executeCommandLive,
  removeCommandBlocks 
} from '../cliTools.js';
import { needsClarification, handleClarification } from '../interactive.js';

const MAX_ITERATIONS = 5; // Prevent infinite loops

export async function executeCliSubMind(subMind, userRequest, generateFn, cfg) {
  console.log('\n' + colorize('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan'));
  console.log(colorize('🧠 Main Agent:', 'brightCyan') + ' Analyzing request...');
  console.log(colorize(`🎯 Delegating to: ${subMind.name}`, 'brightGreen'));
  console.log(colorize('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan') + '\n');
  
  let context = [];
  let iteration = 0;
  let lastCommandResult = null;
  
  while (iteration < MAX_ITERATIONS) {
    iteration++;
    
    // Build the prompt with context from previous executions
    let prompt = subMind.systemPrompt + '\n\n';
    prompt += `User Request: ${userRequest}\n\n`;
    
    if (context.length > 0) {
      prompt += 'Previous Actions and Results:\n';
      prompt += '================================\n';
      for (const ctx of context) {
        prompt += `Action ${ctx.iteration}: ${ctx.action}\n`;
        if (ctx.command) {
          prompt += `Command: ${ctx.command}\n`;
        }
        prompt += `Result: ${ctx.result}\n`;
        if (ctx.output) {
          prompt += `Output:\n${ctx.output}\n`;
        }
        prompt += '---\n';
      }
      prompt += '\n';
    }
    
    if (lastCommandResult) {
      prompt += `\nThe last command ${lastCommandResult.success ? 'succeeded' : 'failed'}.\n`;
      if (!lastCommandResult.success) {
        prompt += `Error: ${lastCommandResult.error}\n`;
      }
      prompt += '\nBased on this result, what would you like to do next?\n';
      prompt += 'You can:\n';
      prompt += '1. Run another command to continue the task\n';
      prompt += '2. Provide a final response if the task is complete\n';
      prompt += '3. Ask for clarification if needed\n';
    }
    
    // Get the sub-mind's response
    const spinner = new Spinner(`🤖 ${subMind.name} is analyzing${iteration > 1 ? ' (iteration ' + iteration + ')' : ''}...`);
    spinner.start();
    
    const result = await generateFn(prompt, 'google', cfg.googleModel, cfg.temperature, cfg);
    spinner.stop();
    
    if (!result.ok) {
      console.log(colorize(`❌ ${subMind.name} encountered an error`, 'red'));
      return {
        success: false,
        error: result.error
      };
    }
    
    const response = result.text;
    
    // Check if the agent wants to execute a command
    if (hasCommandExecution(response)) {
      const cmdExec = parseCommandExecution(response);
      if (cmdExec) {
        // Add to context
        const action = {
          iteration,
          action: 'Execute command',
          command: cmdExec.command,
          result: 'Pending'
        };
        
        // Execute the command
        lastCommandResult = await executeCommandLive(cmdExec.command, {
          workingDir: cmdExec.workingDir,
          checkFirst: cmdExec.checkFirst
        });
        
        // Update context with result
        action.result = lastCommandResult.success ? 'Success' : 'Failed';
        action.output = lastCommandResult.stdout || lastCommandResult.stderr || lastCommandResult.error;
        context.push(action);
        
        // Continue to next iteration
        continue;
      }
    }
    
    // Check if the agent needs clarification
    if (needsClarification(response)) {
      console.log(colorize(`✅ ${subMind.name} completed successfully!\n`, 'green'));
      
      // Handle clarification interactively
      const clarifiedResponse = await handleClarification(response, async (additionalContext) => {
        const updatedPrompt = prompt + `\nUser clarification: ${additionalContext}`;
        const result = await generateFn(updatedPrompt, 'google', cfg.googleModel, cfg.temperature, cfg);
        return result;
      });
      
      if (clarifiedResponse && clarifiedResponse.ok) {
        // Continue with the clarified response
        const updatedResponse = clarifiedResponse.text;
        
        // Check if the clarified response has commands
        if (hasCommandExecution(updatedResponse)) {
          // Store this response and continue to next iteration
          response = updatedResponse;
          continue;
        } else {
          // Return the clarified response
          return {
            success: true,
            response: removeCommandBlocks(updatedResponse),
            subMindName: subMind.name,
            iterations: iteration,
            context
          };
        }
      }
    }
    
    // No more commands to execute and no clarification needed
    const cleanResponse = removeCommandBlocks(response);
    if (cleanResponse.trim()) {
      console.log(colorize(`✅ ${subMind.name} completed successfully!\n`, 'green'));
      return {
        success: true,
        response: cleanResponse,
        subMindName: subMind.name,
        iterations: iteration,
        context
      };
    }
    
    // If we get here with no response, something went wrong
    break;
  }
  
  // Max iterations reached
  console.log(colorize(`⚠️  ${subMind.name} reached maximum iterations`, 'yellow'));
  return {
    success: true,
    response: 'I completed the maximum number of iterations for this task. The commands have been executed as shown above.',
    subMindName: subMind.name,
    iterations: iteration,
    context
  };
}