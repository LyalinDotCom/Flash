import fs from 'node:fs/promises';
import path from 'node:path';
import { colorize } from './colors.js';

// Security check - ensure filename is safe and in current directory
function isValidFilename(filename) {
  // No path separators allowed
  if (filename.includes('/') || filename.includes('\\')) {
    return false;
  }
  
  // No parent directory references
  if (filename.includes('..')) {
    return false;
  }
  
  // No absolute paths
  if (path.isAbsolute(filename)) {
    return false;
  }
  
  // Must be a simple filename
  const normalized = path.normalize(filename);
  return normalized === filename && filename.length > 0;
}

// Read a file from the current directory
export async function readFile(filename) {
  if (!isValidFilename(filename)) {
    return {
      success: false,
      error: 'Invalid filename. Only files in the current directory can be accessed.'
    };
  }
  
  try {
    const filepath = path.join(process.cwd(), filename);
    const content = await fs.readFile(filepath, 'utf8');
    return {
      success: true,
      content,
      filename
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        success: false,
        error: `File '${filename}' not found in current directory.`
      };
    }
    return {
      success: false,
      error: `Error reading file: ${error.message}`
    };
  }
}

// Write a file to the current directory
export async function writeFile(filename, content) {
  if (!isValidFilename(filename)) {
    return {
      success: false,
      error: 'Invalid filename. Only files in the current directory can be created.'
    };
  }
  
  try {
    const filepath = path.join(process.cwd(), filename);
    
    // Check if file exists
    try {
      await fs.access(filepath);
      // File exists, ask for confirmation would go here
      // For now, we'll just overwrite
    } catch {
      // File doesn't exist, which is fine
    }
    
    await fs.writeFile(filepath, content, 'utf8');
    return {
      success: true,
      filename,
      message: `File '${filename}' written successfully.`
    };
  } catch (error) {
    return {
      success: false,
      error: `Error writing file: ${error.message}`
    };
  }
}

// List files in current directory (for context)
export async function listFiles() {
  try {
    const files = await fs.readdir(process.cwd());
    return {
      success: true,
      files: files.filter(f => !f.startsWith('.')) // Exclude hidden files
    };
  } catch (error) {
    return {
      success: false,
      error: `Error listing files: ${error.message}`
    };
  }
}

// Parse tool calls from AI response
export function parseToolCalls(response) {
  const tools = [];
  
  // Look for READ_FILE: filename pattern
  const readMatch = response.match(/READ_FILE:\s*(.+?)(?:\n|$)/);
  if (readMatch) {
    tools.push({
      tool: 'read',
      filename: readMatch[1].trim()
    });
  }
  
  // Look for WRITE_FILE: filename pattern with content
  const writeMatch = response.match(/WRITE_FILE:\s*(.+?)\nCONTENT:\n([\s\S]*?)(?:END_CONTENT|$)/);
  if (writeMatch) {
    tools.push({
      tool: 'write',
      filename: writeMatch[1].trim(),
      content: writeMatch[2].trim()
    });
  }
  
  return tools;
}

// Execute tool calls and return results
export async function executeTools(toolCalls) {
  const results = [];
  
  for (const call of toolCalls) {
    console.log(colorize(`\nExecuting ${call.tool} tool...`, 'cyan'));
    
    if (call.tool === 'read') {
      const result = await readFile(call.filename);
      if (result.success) {
        console.log(colorize(`✅ Read file: ${call.filename}`, 'green'));
        results.push({
          tool: 'read',
          filename: call.filename,
          content: result.content
        });
      } else {
        console.log(colorize(`❌ ${result.error}`, 'red'));
        results.push({
          tool: 'read',
          filename: call.filename,
          error: result.error
        });
      }
    } else if (call.tool === 'write') {
      const result = await writeFile(call.filename, call.content);
      if (result.success) {
        console.log(colorize(`✅ ${result.message}`, 'green'));
        results.push({
          tool: 'write',
          filename: call.filename,
          success: true
        });
      } else {
        console.log(colorize(`❌ ${result.error}`, 'red'));
        results.push({
          tool: 'write',
          filename: call.filename,
          error: result.error
        });
      }
    }
  }
  
  return results;
}

// Check if response contains tool calls
export function hasToolCalls(response) {
  return response.includes('READ_FILE:') || response.includes('WRITE_FILE:');
}

// Remove tool calls from response for clean display
export function removeToolCalls(response) {
  // Remove READ_FILE calls
  response = response.replace(/READ_FILE:\s*.+?(?:\n|$)/g, '');
  
  // Remove WRITE_FILE calls with better pattern matching
  response = response.replace(/WRITE_FILE:\s*.+?\nCONTENT:\n[\s\S]*?END_CONTENT/g, '');
  
  // Also remove any standalone END_CONTENT that might be left
  response = response.replace(/END_CONTENT/g, '');
  
  return response.trim();
}