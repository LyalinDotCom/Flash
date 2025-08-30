import fs from 'node:fs';
import path from 'node:path';

export function loadFlashConfig(startDir = process.cwd()) {
  // Search upwards from startDir for flash.config.json within the Flash root.
  let dir = startDir;
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(dir, 'flash.config.json');
    if (fs.existsSync(candidate)) {
      try {
        return JSON.parse(fs.readFileSync(candidate, 'utf8'));
      } catch {}
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return {
    defaultProvider: 'google',
    googleModel: 'gemini-2.5-flash',
    localModel: 'gemma3n:e4b',
    temperature: 0.7,
    copyInteractiveCommands: true,
  };
}
