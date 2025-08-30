# Flash CLI (MVP)

A minimal CLI scaffold inspired by the gemini-cli architecture.

- Root package.json with workspaces and a `bin` entry pointing to `bundle/flash.js`.
- `packages/cli` for user-facing CLI code.
- `packages/core` reserved for shared logic and future expansion.
- `scripts/build.js` generates the single-file bundle used by the `bin` entry.

Quick start

1) Build once:
   - `node Flash/scripts/build.js`

2) Run via the wrapper:
   - `bash Flash/bin/Flash --help`
   - `bash Flash/bin/Flash --version`
   - `bash Flash/bin/Flash --interactive`
   - `echo "hello" | bash Flash/bin/Flash`

3) Direct bundle run:
   - `node Flash/bundle/flash.js --help`

Genkit integration

- Configure in `Flash/flash.config.json`:
  - `defaultProvider`: `google` or `local`
  - `googleModel`: e.g. `gemini-2.5-flash`
  - `localModel`: e.g. `gemma3n:e4b` (must exist in Ollama)

- Install Genkit CLI and deps (run on your machine):
  - `npm install -g genkit-cli`
  - `cd Flash/packages/genkit`
  - `npm install`
  - `npm run build`
  - Optional Dev UI: `genkit start` in one terminal, and `npm run build -- --watch` in another.

- Env for Google provider:
  - `export GEMINI_API_KEY=...`

- Run Flash with Genkit:
  - Cloud: `Flash "write a haiku about koalas"`
  - Local: `Flash -l -m gemma3n:e4b "offline test"`

Notes

- To run `Flash/bin/Flash` directly, set the executable bit:
  - `chmod +x Flash/bin/Flash`
- For now, no external dependencies or AI integrations are included.
- See `Flash/MEMORY.md` for the architectural choices and next steps.
