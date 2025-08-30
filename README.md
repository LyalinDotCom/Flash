# Flash CLI

Flash is a lightweight, terminal-first AI helper inspired by the Gemini CLI architecture, tailored for quick requests at the command line. It favors a simple, fast workflow while doing its best on more complex tasks when you need it.

- Local AI via Genkit + Ollama
- Cloud AI via Genkit + Google Gemini
- System-aware hidden prompt for OS-correct commands
- Minimal setup; no heavy IDE requirements

> Why another CLI? We wanted a small, practical utility focused on everyday developer prompts in a terminal. Flash is intentionally lean, with sensible defaults and a clear path for growth.

---

## Quick Look

Run with no arguments to see the welcome banner and basics:

```bash
flash
```

Ask something simple (cloud by default):

```bash
flash "create a git alias for amend push"
```

Use your local model via Ollama (no need to specify `-m`):

```bash
flash -l "what is the capital of ohio"
```

Show the hidden system prompt Flash sends (for debugging):

```bash
flash --show-system-prompt
```

---

## Requirements

- Node.js 20 or newer
- macOS / Linux / Windows (local support is optimized for macOS/Linux)
- For cloud mode: a valid `GEMINI_API_KEY` (or `GOOGLE_API_KEY`)
- For local mode:
  - Ollama installed and running
  - Model pulled (default: `gemma3n:e4b`)

---

## Install (from this repo)

You have two simple ways to run Flash from this repository.

### Option A: Local project link (recommended)

This keeps everything inside the repo and avoids global npm permissions.

```bash
# From the repo root
node Flash/scripts/build.js
node Flash/scripts/link-local.js

# Add Flash’s local bin to your PATH (current shell)
export PATH="$PWD/Flash/.global/bin:$PATH"

# Test
flash --version
flash --help
```

To make PATH persistent, add the export line to your shell profile (e.g., `~/.zshrc`).

### Option B: npm link (global)

If your npm global prefix is user-writable (e.g., via nvm), you can:

```bash
cd Flash
npm link

# Then
flash --help
```

If you see EACCES errors on macOS, prefer Option A or switch to an nvm-managed Node.

---

## Provider Setup

### Cloud (Gemini via Genkit)

1) Set your API key in `.env` (Flash loads `.env` from current dir, `Flash/.env`, or `Flash/packages/genkit/.env`).

```bash
# .env
GEMINI_API_KEY=YOUR_KEY
```

2) Build the Genkit package:

```bash
cd Flash/packages/genkit
npm install
npm run build
```

3) Use Flash normally (cloud is default):

```bash
flash "explain what git worktrees are"
```

### Local (Ollama via Genkit)

1) Install and start Ollama, then pull the default model:

```bash
ollama pull gemma3n:e4b
```

2) Build the Genkit package (once):

```bash
cd Flash/packages/genkit
npm install
npm run build
```

3) Run with `-l` (no `-m` needed):

```bash
flash -l "summarize SOLID principles"
```

Optional: override the model:

```bash
flash -l -m gemma3n:e4b "write a short haiku about koalas"
```

If your Ollama host isn’t the default, set:

```bash
export OLLAMA_HOST="http://127.0.0.1:11434"
```

---

## Configuration

Flash reads `Flash/flash.config.json`:

```json
{
  "defaultProvider": "google",
  "googleModel": "gemini-2.5-flash",
  "localModel": "gemma3n:e4b",
  "temperature": 0.7
}
```

- `defaultProvider`: `google` or `local`
- `googleModel`: default Gemini model when cloud provider is used
- `localModel`: default Ollama model (used when `-l` is passed)
- `temperature`: generation temperature for both providers

Flash also loads `.env` for provider credentials:
- `GEMINI_API_KEY` or `GOOGLE_API_KEY` (cloud)
- `OLLAMA_HOST` (local, optional)

---

## Usage

```bash
# Cloud default
flash "create a bash alias to cd into ~/Source"

# Local via Ollama (default model from config)
flash -l "how do I check my Node version?"

# Override model explicitly
flash -l -m gemma3n:e4b "summarize yesterday’s git commits"

# Pipe input
cat README.md | flash

# Inspect hidden system context used in prompts
flash --show-system-prompt

# Help
flash --help
```

What Flash does by default:
- Prepends a hidden system prompt to improve OS-appropriate instructions (date/time, OS, Node/npm, shell, terminal, cwd, provider/model, etc.)
- Chooses the right provider based on flags and config
- Keeps output concise and focused for terminal workflows

---

## Philosophy & Roadmap

- Terminal-first. Simple, fast, predictable.
- Local-first option via Ollama, cloud power via Gemini when needed.
- Start simple, scale as needed: better parsing, multi-step agents, more flows.

Planned (subject to change):
- Richer argument parsing and subcommands
- Optional interactive UI (Ink)
- Small library of “flows” for common DevOps/dev tasks

---

## Troubleshooting

- Flash command not found
  - Ensure PATH includes `Flash/.global/bin`: `export PATH="$PWD/Flash/.global/bin:$PATH"`
  - Or use `cd Flash && npm link` with an nvm-managed Node

- Local model errors
  - Verify Ollama is running and model exists: `ollama list`
  - Pull default model: `ollama pull gemma3n:e4b`
  - Ensure Genkit package is built: `cd Flash/packages/genkit && npm install && npm run build`

- Cloud auth errors
  - Ensure `.env` contains `GEMINI_API_KEY` (or `GOOGLE_API_KEY`)
  - Rebuild if needed: `node Flash/scripts/build.js`

---

## Contributing

Feedback, ideas, and contributions are welcome. This project is intentionally small — please open issues/PRs with focused changes.

---

## License

TBD (for now, this repo is for local development/testing). If you plan to distribute, add an appropriate license.
