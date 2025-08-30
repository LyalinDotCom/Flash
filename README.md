# Flash ⚡

A smart AI assistant for your terminal that works both online and offline. Flash helps with quick commands, code snippets, and everyday developer tasks - no complex setup required.

## Features

- **🌐 Works Everywhere** - Online with Google's Gemini, offline with local models
- **🚀 Auto-Fallback** - Automatically switches to local mode when offline
- **🎨 Beautiful CLI** - Colorful ASCII art that adapts to your terminal size
- **⚡ Lightning Fast** - Optimized for quick, practical responses
- **🔧 Zero Config** - Works out of the box with smart defaults

## Quick Start

### Install from GitHub

```bash
# Clone and install
git clone https://github.com/yourusername/Flash.git
cd Flash
npm install
npm link

# First time setup (installs Ollama & downloads AI model)
flash --init

# You're ready!
flash "how do I undo my last git commit?"
```

### Basic Usage

```bash
# Ask anything (uses cloud by default, falls back to local if offline)
flash "create a Python function to validate email addresses"

# Force local mode
flash -l "explain Docker volumes"

# Check system health
flash --doctor

# See all options
flash --help
```

## Examples

```bash
# Quick commands
flash "chmod command to make a script executable"

# Code generation
flash "write a React hook for localStorage"

# System help
flash "how to find large files on macOS"

# Piped input
cat error.log | flash "explain this error"
```

## Offline Mode

Flash automatically works offline! When you run `flash --init`, it sets up everything needed for local AI. If you lose internet connection, Flash seamlessly switches to your local model.

To always use local mode:
```bash
flash -l "your question here"
```

## Commands

- `flash [message]` - Ask Flash anything
- `flash --init` - Set up local AI (one-time setup)
- `flash --doctor` - Check if everything is working
- `flash --help` - Show help
- `flash --version` - Show version
- `flash -l` - Use local AI model
- `flash -i` - Interactive mode

## Requirements

- Node.js 20 or newer
- macOS, Linux, or Windows
- Internet connection (for cloud mode)
- 2GB disk space (for local AI model)

## Troubleshooting

Run `flash --doctor` to diagnose any issues. Common fixes:

**Flash command not found**
```bash
npm link  # Run from the Flash directory
```

**Local mode not working**
```bash
flash --init  # This will set up everything needed
```

**API errors**
- For cloud mode, set your Gemini API key:
  ```bash
  echo "GEMINI_API_KEY=your-key-here" > .env
  ```
- Get a free key at https://makersuite.google.com/app/apikey

## Privacy

- **Local mode**: All processing happens on your machine
- **Cloud mode**: Queries are sent to Google's Gemini API
- Flash never stores or logs your queries

## License

MIT