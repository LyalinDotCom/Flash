import fs from 'node:fs';
import path from 'node:path';
import { runGenkitGenerate } from './genkitRunner.js';

// Image formats we support
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

export function isImageFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

export function readImageAsBase64(filename) {
  try {
    const filepath = path.resolve(filename);
    const data = fs.readFileSync(filepath);
    return data.toString('base64');
  } catch (error) {
    throw new Error(`Failed to read image ${filename}: ${error.message}`);
  }
}

export function writeImageFromBase64(filename, base64Data) {
  try {
    // Clean base64 data (remove data URL prefix if present)
    const cleanData = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanData, 'base64');
    
    const filepath = path.resolve(filename);
    fs.writeFileSync(filepath, buffer);
    
    return true;
  } catch (error) {
    throw new Error(`Failed to write image ${filename}: ${error.message}`);
  }
}

export function hasImageGeneration(text) {
  return text.includes('GENERATE_IMAGE:');
}

export function hasImageWrite(text) {
  return text.includes('WRITE_IMAGE:');
}

export function parseImageGeneration(text) {
  const match = text.match(/GENERATE_IMAGE:\s*\nPROMPT:\s*(.+?)(?:\nSOURCE_IMAGES:\s*(.+?))?\s*\nEND_GENERATE/s);
  
  if (!match) return null;
  
  const prompt = match[1].trim();
  const sourceFiles = match[2] ? match[2].split(',').map(f => f.trim()).filter(Boolean) : [];
  
  return { prompt, sourceFiles };
}

export function parseImageWrite(text) {
  const match = text.match(/WRITE_IMAGE:\s*(.+?)\s*\nBASE64_DATA:\s*(.+?)\s*\nEND_IMAGE/s);
  
  if (!match) return null;
  
  return {
    filename: match[1].trim(),
    base64Data: match[2].trim()
  };
}

export async function generateImage(prompt, sourceFiles = [], cfg) {
  try {
    // Build the multimodal prompt
    const promptParts = [{ text: prompt }];
    
    // Add source images if provided
    for (const file of sourceFiles) {
      if (!isImageFile(file)) {
        throw new Error(`${file} is not a supported image format`);
      }
      
      const base64 = readImageAsBase64(file);
      const ext = path.extname(file).toLowerCase().substring(1);
      const mimeType = ext === 'jpg' ? 'jpeg' : ext;
      
      promptParts.push({
        media: { url: `data:image/${mimeType};base64,${base64}` }
      });
    }
    
    // Generate image using Gemini
    const result = await runGenkitGenerate({
      prompt: promptParts,
      config: { responseModalities: ['TEXT', 'IMAGE'] }
    });
    
    if (result.ok && result.media && result.media.url) {
      return {
        success: true,
        imageData: result.media.url,
        text: result.text || 'Image generated successfully'
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to generate image'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

export function removeImageCommands(text) {
  // Remove GENERATE_IMAGE blocks
  text = text.replace(/GENERATE_IMAGE:[\s\S]*?END_GENERATE/g, '').trim();
  
  // Remove WRITE_IMAGE blocks
  text = text.replace(/WRITE_IMAGE:[\s\S]*?END_IMAGE/g, '').trim();
  
  return text;
}