# Project Flash — Architecture Memory

This doc captures the key learnings from gemini-cli to guide Flash’s long-term architecture.

Key inspirations from gemini-cli:

- Monorepo layout: root package.json with npm workspaces and a single executable exposed via the root `bin` field.
- Separation of concerns: `packages/cli` for the user-facing CLI, `packages/core` for backend logic and shared utilities.
- Single entry file for the installed binary: bundle artifact referenced by `bin` (gemini-cli uses `bundle/gemini.js`).
- Build step that prepares a distributable entrypoint decoupled from raw source.

How Flash mirrors this today (minimal MVP):

- Root `Flash/package.json` with workspaces and `bin: { "Flash": "bundle/flash.js" }`.
- `packages/cli` contains the user entry (`index.js`) and CLI logic in `src/flash.js`.
- `packages/core` exists as a placeholder for future non-UI logic.
- Simple build script (`scripts/build.js`) generates a single-file bundle at `bundle/flash.js` with a node shebang.

Next steps we can adopt later (from gemini-cli):

- Replace the simple interactive loop with a proper UI framework (e.g., Ink) if needed.
- Add argument parsing (e.g., yargs) for richer commands and subcommands.
- Introduce configuration loading and settings in `core`.
- Add a small test setup and CI scripts.
- Optionally switch to TypeScript and introduce a real bundler.

