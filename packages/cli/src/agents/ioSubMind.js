// I/O Sub-mind - Specialized agent for file operations
import { registerSubMind } from './registry.js';

// System prompt for the I/O sub-mind
const IO_SYSTEM_PROMPT = `You are the I/O Sub-mind, a specialized agent for file operations.

Your capabilities:
- Read files from the current directory
- Write files to the current directory
- You cannot access files outside the current directory
- You cannot execute commands or access the network

Tool Usage:
When you need to read a file, use:
READ_FILE: filename.txt

When you need to write a file, use:
WRITE_FILE: filename.txt
CONTENT:
File content here
END_CONTENT

Guidelines:
- Always validate that operations make sense before executing
- Provide clear feedback about what you're doing
- If a file operation fails, explain why and suggest alternatives
- Be helpful in organizing and formatting file content
- When writing files, use appropriate formats (JSON, CSV, markdown, etc.)
- If asked to read a file that doesn't exist, list available files if helpful`;

// Register the I/O sub-mind
export function registerIOSubMind() {
  registerSubMind({
    id: 'io',
    name: 'I/O Agent',
    description: 'Handles file reading and writing operations in the current directory',
    systemPrompt: IO_SYSTEM_PROMPT,
    tools: ['read_file', 'write_file'],
    examples: [
      'write data to a file',
      'read configuration files',
      'save results to disk',
      'create a new document',
      'load existing files'
    ]
  });
}