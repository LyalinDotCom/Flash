import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const pExecFile = promisify(execFile);

async function getNpmVersionFast() {
  const ua = process.env['npm_config_user_agent'];
  if (ua) {
    const m = ua.match(/npm\/(\d+\.\d+\.\d+)/);
    if (m) return m[1];
  }
  try {
    const { stdout } = await pExecFile('npm', ['-v'], { timeout: 300, windowsHide: true });
    return stdout.trim();
  } catch {
    return 'unknown';
  }
}

function localDateStrings() {
  const now = new Date();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown';
  return {
    iso: now.toISOString(),
    local: now.toLocaleString(),
    tz,
  };
}

function osInfo() {
  return {
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    type: os.type(),
  };
}

export async function buildSystemPrompt({ provider, model, cliVersion }) {
  const when = localDateStrings();
  const sys = osInfo();
  const nodeVersion = process.version;
  const npmVersion = await getNpmVersionFast();
  const shell = process.env['SHELL'] || process.env['ComSpec'] || 'unknown';
  const term = process.env['TERM'] || 'unknown';
  const cwd = process.cwd();

  const lines = [
    'System Context (hidden):',
    `- Now: ${when.local} (${when.iso}) TZ=${when.tz}`,
    `- OS: ${sys.type} ${sys.platform} ${sys.release} ${sys.arch}`,
    `- Node: ${nodeVersion}`,
    `- npm: ${npmVersion}`,
    `- Shell: ${shell}`,
    `- Terminal: ${term}`,
    `- CWD: ${cwd}`,
    `- Flash version: ${cliVersion}`,
    `- Flash provider: ${provider}`,
    `- Flash model: ${model}`,
    '',
    'Instructions:',
    `- Provide instructions tailored for ${sys.platform} on ${sys.type}.`,
    '- Prefer macOS/Linux POSIX shell commands when on darwin/linux; avoid Windows-specific commands unless asked.',
    '- Keep answers concise and actionable for terminal usage.',
  ];

  return lines.join('\n');
}

