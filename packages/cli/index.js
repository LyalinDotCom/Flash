#!/usr/bin/env node

// Minimal CLI entrypoint inspired by gemini-cli/packages/cli/index.ts
// Keeps the global entry consistent and defers to src/flash.js

import { main } from './src/flash.js';

async function run() {
  try {
    await main();
  } catch (error) {
    const msg = error instanceof Error ? error.stack ?? error.message : String(error);
    console.error(msg);
    process.exit(1);
  }
}

run();

