// Minimal core placeholder to mirror the gemini-cli architecture.
// Future: put config, state, and tool orchestration here.

export class FlashConfig {
  constructor(opts = {}) {
    this.debug = Boolean(opts.debug);
  }
  isDebug() {
    return this.debug;
  }
}

export function createDefaultConfig() {
  return new FlashConfig({ debug: false });
}

