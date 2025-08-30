# Flash Genkit Package

This package wires Genkit for Flash, supporting Google Gemini and local Ollama.

- Single entry: `src/index.ts` (plugins + flows)
- Build: `npm run build` -> outputs to `dist/`
- Dev UI: `genkit start` in one terminal, `npm run build -- --watch` in another

Install

- `npm install`
- `npm install -g genkit-cli`

Environment

- For Google provider: `export GEMINI_API_KEY=...`
- For local provider: ensure Ollama is installed and the model is available:
  - `ollama pull gemma3n:e4b`

Run Flash CLI

- Cloud (default): `Flash "write a haiku about koalas"`
- Local: `Flash -l -m gemma3n:e4b "offline test"`

Inspect flows (optional)

- Start Dev UI: `genkit start`
- Then visit http://localhost:4000 and run `flashTextFlow`.
