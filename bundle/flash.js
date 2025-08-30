#!/usr/bin/env node
// Generated minimal bundle for Flash CLI
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

function getPackageVersion() {
  try {
    const rootPkg = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), 'Flash', 'package.json'), 'utf8')
    );
    return rootPkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function printHelp() {
  const help = `Flash CLI\n\n` +
    `Usage:\n` +
    `  Flash [options] [message]\n\n` +
    `Options:\n` +
    `  -h, --help       Show help\n` +
    `  -v, --version    Show version\n` +
    `  -i, --interactive Start simple interactive prompt\n\n` +
    `Examples:\n` +
    `  Flash --help\n` +
    `  Flash --version\n` +
    `  Flash "hello world"\n` +
    `  Flash --interactive`;
  console.log(help);
}

async function interactivePrompt() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'flash> '
  });

  console.log('Welcome to Flash interactive mode. Type "help" or "exit".');
  rl.prompt();

  rl.on('line', (line) => {
    const input = line.trim();
    if (input === 'exit' || input === 'quit') {
      rl.close();
      return;
    }
    if (input === 'help') {
      console.log('Commands: help, exit');
    } else if (input.length > 0) {
      console.log(`You said: ${input}`);
    }
    rl.prompt();
  });

  await new Promise((resolve) => rl.on('close', resolve));
}

export async function main() {
  const argv = process.argv.slice(2);

  if (argv.includes('-h') || argv.includes('--help')) {
    printHelp();
    return;
  }
  if (argv.includes('-v') || argv.includes('--version')) {
    console.log(getPackageVersion());
    return;
  }
  if (argv.includes('-i') || argv.includes('--interactive')) {
    await interactivePrompt();
    return;
  }

  const message = argv.join(' ').trim();
  if (message) {
    console.log(`Flash received: ${message}`);
  } else if (!process.stdin.isTTY) {
    // If input is piped, echo it.
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(Buffer.from(chunk));
    }
    const stdinText = Buffer.concat(chunks).toString('utf8').trim();
    if (stdinText.length > 0) {
      console.log(`Flash received from stdin: ${stdinText}`);
    } else {
      printHelp();
    }
  } else {
    printHelp();
  }
}


// Entry runner

(async () => {
  try {
    await main();
  } catch (error) {
    const msg = error instanceof Error ? (error.stack ?? error.message) : String(error);
    console.error(msg);
    process.exit(1);
  }
})();
