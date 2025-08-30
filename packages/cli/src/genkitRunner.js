import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';

function findFlashRoot(fromUrl) {
  let dir = path.dirname(fileURLToPath(fromUrl));
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, 'flash.config.json');
    if (fs.existsSync(candidate)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

export async function runGenkitGenerate({ prompt, provider, model, temperature, config }) {
  try {
    // Try relative import (dev mode from packages/cli/src)
    let mod;
    try {
      mod = await import('../../genkit/dist/index.js');
    } catch {
      // Try from bundled location: Flash/bundle -> Flash/packages/genkit/dist/index.js
      const root = findFlashRoot(import.meta.url);
      if (!root) throw new Error('Cannot locate Flash root to resolve Genkit build.');
      const genkitDist = path.join(root, 'packages', 'genkit', 'dist', 'index.js');
      const url = pathToFileURL(genkitDist).href;
      mod = await import(url);
    }
    
    // Check if this is an image generation request
    if (config && config.responseModalities && config.responseModalities.includes('IMAGE')) {
      if (!mod || !mod.generateImage) {
        throw new Error('generateImage not found in @projectflash/genkit build. Run npm install and npm run build in packages/genkit.');
      }
      const result = await mod.generateImage({ prompt, config });
      return { ok: true, text: result.text, media: result.media };
    } else {
      // Regular text generation
      if (!mod || !mod.generateText) {
        throw new Error('generateText not found in @projectflash/genkit build. Run npm install and npm run build in packages/genkit.');
      }
      const text = await mod.generateText({ prompt, provider, model, temperature });
      return { ok: true, text };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
