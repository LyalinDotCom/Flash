// Sub-mind registry system for managing specialized agents

const subMinds = new Map();

// Register a sub-mind with its configuration
export function registerSubMind(config) {
  if (!config.id || !config.name || !config.systemPrompt) {
    throw new Error('Sub-mind must have id, name, and systemPrompt');
  }
  
  subMinds.set(config.id, {
    id: config.id,
    name: config.name,
    description: config.description || '',
    systemPrompt: config.systemPrompt,
    tools: config.tools || [],
    examples: config.examples || []
  });
}

// Get all registered sub-minds
export function getAllSubMinds() {
  return Array.from(subMinds.values());
}

// Get a specific sub-mind by ID
export function getSubMind(id) {
  return subMinds.get(id);
}

// Format sub-minds for the main agent's system prompt
export function formatSubMindsForPrompt() {
  const subMindsList = getAllSubMinds();
  if (subMindsList.length === 0) return '';
  
  let prompt = '\nAvailable Sub-minds:\n';
  for (const subMind of subMindsList) {
    prompt += `\n- ${subMind.name} (ID: ${subMind.id})`;
    if (subMind.description) {
      prompt += `\n  Description: ${subMind.description}`;
    }
    if (subMind.examples.length > 0) {
      prompt += '\n  Examples: ' + subMind.examples.join(', ');
    }
  }
  
  return prompt;
}