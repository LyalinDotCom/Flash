import { colorize } from '../colors.js';
import { getSubMind } from './registry.js';

// Token usage tracking
const tokenUsageTracker = {
  requests: [],
  windowMs: 60000, // 1 minute window
  maxRequests: 20, // Max 20 requests per minute
  maxTokensPerRequest: 500, // Approximate max tokens per request
};

// Clean old requests from tracker
function cleanTokenTracker() {
  const now = Date.now();
  tokenUsageTracker.requests = tokenUsageTracker.requests.filter(
    timestamp => now - timestamp < tokenUsageTracker.windowMs
  );
}

// Check if we're within rate limits
function canMakeAnalysisRequest() {
  cleanTokenTracker();
  return tokenUsageTracker.requests.length < tokenUsageTracker.maxRequests;
}

// Track a new request
function trackAnalysisRequest() {
  tokenUsageTracker.requests.push(Date.now());
}

// Execute quick analysis with the analysis sub-mind
export async function executeQuickAnalysis(analysisPrompt, generateFn, options = {}) {
  const {
    maxOutputTokens = 50,
    temperature = 0.1,
    showThinking = false,
    model = 'gemini-2.0-flash-exp'
  } = options;
  
  // Check rate limits
  if (!canMakeAnalysisRequest()) {
    console.log(colorize('⚠️  Analysis rate limit reached, falling back to pattern matching', 'yellow'));
    return {
      success: false,
      error: 'Rate limit exceeded',
      fallback: true
    };
  }
  
  // Track this request
  trackAnalysisRequest();
  
  // Get the analysis sub-mind
  const subMind = getSubMind('analysis');
  if (!subMind) {
    return {
      success: false,
      error: 'Analysis agent not found'
    };
  }
  
  // Build focused prompt
  const fullPrompt = `${subMind.systemPrompt}\n\nAnalysis Request:\n${analysisPrompt}`;
  
  try {
    if (showThinking) {
      console.log(colorize('\n🤔 Analyzing...', 'gray'));
    }
    
    // Use a fast model with low temperature for consistent results
    const result = await generateFn(fullPrompt, 'google', model, temperature, {
      maxOutputTokens
    });
    
    if (!result.ok) {
      return {
        success: false,
        error: result.error
      };
    }
    
    return {
      success: true,
      response: result.text.trim(),
      tokensUsed: result.usage?.totalTokens || 0
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Specific analysis functions
export async function analyzeIfWaitingForInput(output, timeSinceLastOutput, generateFn) {
  // Truncate output to save tokens (last 500 chars should be enough)
  const truncatedOutput = output.slice(-500);
  
  const analysisPrompt = `Terminal output (last 500 chars):
"""
${truncatedOutput}
"""

Time since last output: ${Math.round(timeSinceLastOutput / 1000)} seconds

Is this command waiting for user input? Consider:
- Interactive prompts (questions, selections, confirmations)
- Active processing (logs, downloads, builds) means NOT waiting
- Common patterns: "?", "›", "(Y/n)", "Select:", "Choose:"

Answer only: YES or NO`;

  const result = await executeQuickAnalysis(analysisPrompt, generateFn, {
    maxOutputTokens: 10,
    showThinking: true
  });
  
  if (result.success) {
    const answer = result.response.toUpperCase();
    return answer.includes('YES');
  }
  
  // Fallback to false if analysis fails
  return false;
}

// Generic analysis function for other use cases
export async function analyzeContent(content, question, generateFn, options = {}) {
  const analysisPrompt = `Content:
"""
${content}
"""

${question}`;

  return executeQuickAnalysis(analysisPrompt, generateFn, options);
}