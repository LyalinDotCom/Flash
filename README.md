# Flash ⚡

> ⚠️ **IMPORTANT DISCLAIMER**: Flash can execute terminal commands on your behalf, including potentially destructive operations. This tool is experimental and not fully tested. Commands may modify or delete files, alter system settings, or perform other irreversible actions. Always review commands before allowing execution. **USE AT YOUR OWN RISK.**

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

# CLI operations
flash "deploy to firebase"
flash "run the tests"
flash "build and deploy the app"
flash "check what version of node I have"
flash "commit my changes with a good message"
```

## Multi-Agent System (Gemini Mode)

When using Gemini (cloud mode), Flash employs a sophisticated multi-agent architecture:

### Main Agent (Router)
The main agent analyzes your request and decides whether to:
- Respond directly for general questions
- Delegate to a specialized sub-agent
- Ask for clarification if the request is ambiguous

### Specialized Sub-Agents:

#### 📋 I/O Agent
- **Description**: Handles file reading and writing operations in the current directory
- **Tools**: read_file, write_file
- **Example prompts**:
  - "read the package.json file"
  - "save this to notes.txt"
  - "create a shopping list"
  - "show me what's in config.json"

#### 📋 Image Generation Agent
- **Description**: Handles image generation, manipulation, and saving. Can generate images from text prompts and combine multiple source images.
- **Tools**: generate_image, read_file, write_image
- **Example prompts**:
  - "generate an image of a sunset over mountains"
  - "create a logo for my startup"
  - "combine these two images"
  - "add this object to my photo"

#### 📋 CLI Assistant
- **Description**: Executes terminal commands based on natural language requests. Can check prerequisites, run commands with live output, and handle complex multi-step operations.
- **Tools**: execute_command
- **Example prompts**:
  - "deploy to firebase"
  - "run the build process"
  - "start the development server"
  - "install dependencies"
  - "run tests"

### Usage Examples:
- "What's the capital of France?" → Main agent responds directly
- "Save the capitals of Europe to a file" → Delegates to I/O agent
- "Generate an image of a mountain" → Delegates to Image agent
- "Deploy to production" → Delegates to CLI assistant
- "Build and run tests" → CLI assistant handles multi-step tasks

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

## CLI Assistant (Gemini Mode)

Flash can execute terminal commands using natural language:

- **Smart Command Detection**: Understands what you want to do
- **Iterative Execution**: Can run multiple commands based on results
- **Prerequisite Checking**: Verifies tools are installed
- **Live Output**: Shows command output as it runs
- **Context Awareness**: Learns from command outputs to make decisions
- **Error Handling**: Provides helpful feedback on failures

Examples:
- "deploy to firebase" → Checks firebase CLI, runs deployment
- "run the tests" → Detects test framework, executes tests
- "build the React app" → Finds build script, runs it
- "check my node version" → Runs `node --version`
- "install firebase tools" → Checks npm, installs package, verifies

## Offline Mode

Flash automatically works offline! When you run `flash --init`, it sets up everything needed for local AI. If you lose internet connection, Flash seamlessly switches to your local model.

To always use local mode:
```bash
flash -l "your question here"
```

## Commands

- `flash [message]` - Ask Flash anything
- `flash .` - Enter multiline mode (press Enter twice to submit)
- `flash --init` - Set up local AI (one-time setup)
- `flash --doctor` - Check if everything is working
- `flash --agents` - Show all available agents and their capabilities
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

## Configuration

Flash can be configured using a `flash.config.json` file in your project root:

```json
{
  "defaultProvider": "google",
  "googleModel": "gemini-2.5-flash",
  "localModel": "gemma3n:e4b",
  "temperature": 0.7,
  "copyInteractiveCommands": true,
  "confirmDestructiveCommands": true
}
```

Settings:
- `copyInteractiveCommands`: Automatically copy commands to clipboard when interactive input is detected (default: true)
- `confirmDestructiveCommands`: Require confirmation before executing potentially destructive commands (default: true)

## Privacy

- **Local mode**: All processing happens on your machine
- **Cloud mode**: Queries are sent to Google's Gemini API
- Flash never stores or logs your queries

## License

MIT