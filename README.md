# Flash ⚡

A smart multi-agent AI assistant for your terminal that works both online and offline. Flash helps with quick commands, code snippets, file operations, and everyday developer tasks - no complex setup required.

## Features

- **🤖 Multi-Agent System** - Intelligent task delegation to specialized agents (Gemini)
- **🌐 Works Everywhere** - Online with Google's Gemini, offline with local models
- **🚀 Auto-Fallback** - Automatically switches to local mode when offline
- **🎨 Beautiful CLI** - Colorful ASCII art that adapts to your terminal size
- **⚡ Lightning Fast** - Optimized for quick, practical responses
- **🔧 Zero Config** - Works out of the box with smart defaults
- **📁 File Operations** - Read and write files in your current directory
- **🖼️ Image Generation** - Create images from text prompts and combine source images
- **💬 Smart Clarifications** - Asks for details when your request is ambiguous

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

# File operations
flash "create a shopping list file"
flash "read the package.json file"
flash "write a Python hello world script"
flash "save the 50 US state capitals to a CSV file"

# Image generation
flash "generate an image of a cyberpunk city"
flash "create a logo for a coffee shop"
flash "combine these photos into one image"
flash "add a sunset background to my photo.png"
```

## Multi-Agent System (Gemini Mode)

When using Gemini (cloud mode), Flash employs a sophisticated multi-agent architecture:

- **Main Agent**: Analyzes your request and decides whether to handle it directly or delegate
- **I/O Agent**: Specialized in file operations (reading/writing files)
- **Image Agent**: Specialized in generating and manipulating images
- **Smart Delegation**: Automatically routes tasks to the right agent

Examples:
- "What's the capital of France?" → Main agent responds directly
- "Save the capitals of Europe to a file" → Delegates to I/O agent
- "Generate an image of a mountain" → Delegates to Image agent
- "Combine photo1.png with photo2.png" → Delegates to Image agent

## File Operations

Flash can read and write files in your current directory. Just ask naturally:

- **Reading**: "show me what's in config.json", "read my image.png"
- **Writing**: "create a todo list", "save this to notes.txt"
- **Security**: Flash can only access files in the current directory (no paths allowed)

## Image Generation (Gemini Mode)

Flash can generate images using Gemini's advanced image generation capabilities:

- **Text to Image**: "generate an image of a futuristic city"
- **Image Combination**: "combine photo1.png with photo2.png"
- **Image + Text**: "add this plant to my room photo"
- **Auto-Save**: Generated images are automatically saved with timestamps

Supported formats: PNG, JPG, JPEG, GIF, WebP

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