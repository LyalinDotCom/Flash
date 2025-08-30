import { getAllSubMinds } from './agents/registry.js';
import { colorize, applyGradient } from './colors.js';

export function showAgents() {
  const agents = getAllSubMinds();
  
  console.log('\n' + applyGradient('🤖 Flash Multi-Agent System'));
  console.log(colorize('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan'));
  
  console.log('\n' + colorize('Main Agent (Router)', 'brightYellow'));
  console.log('The main agent analyzes your request and decides whether to:');
  console.log('  • Respond directly for general questions');
  console.log('  • Delegate to a specialized sub-agent');
  console.log('  • Ask for clarification if the request is ambiguous');
  
  console.log('\n' + colorize('Specialized Sub-Agents:', 'brightYellow'));
  
  for (const agent of agents) {
    console.log('\n' + colorize(`📋 ${agent.name}`, 'brightGreen') + colorize(` (ID: ${agent.id})`, 'gray'));
    
    if (agent.description) {
      console.log(colorize('   Description:', 'cyan') + ' ' + agent.description);
    }
    
    if (agent.tools && agent.tools.length > 0) {
      console.log(colorize('   Tools:', 'cyan') + ' ' + agent.tools.join(', '));
    }
    
    if (agent.examples && agent.examples.length > 0) {
      console.log(colorize('   Example prompts:', 'cyan'));
      // Show up to 5 examples
      const exampleCount = Math.min(agent.examples.length, 5);
      for (let i = 0; i < exampleCount; i++) {
        console.log(`     • "${agent.examples[i]}"`);
      }
      if (agent.examples.length > 5) {
        console.log(`     • ... and ${agent.examples.length - 5} more`);
      }
    }
  }
  
  console.log('\n' + colorize('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan'));
  console.log('\n' + colorize('Usage Examples:', 'brightYellow'));
  console.log('  flash "What is the capital of France?"       # Main agent responds');
  console.log('  flash "Save this info to a file"             # Delegates to I/O Agent');
  console.log('  flash "Generate an image of a sunset"        # Delegates to Image Agent');
  console.log('  flash "Deploy to production"                 # Delegates to CLI Assistant');
  console.log('  flash "Build and run tests"                  # CLI Assistant handles multi-step tasks');
  
  console.log('\n' + colorize('Tips:', 'brightYellow'));
  console.log('  • Be specific in your requests for better agent routing');
  console.log('  • The main agent will ask for clarification if needed');
  console.log('  • Sub-agents can handle complex, multi-step operations');
  console.log('  • Use "flash ." for multiline input mode');
  console.log('');
}