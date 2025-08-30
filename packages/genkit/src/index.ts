import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { ollama } from 'genkitx-ollama';

const OLLAMA_SERVER = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';

export const ai = genkit({
  plugins: [
    googleAI(),
    ollama({
      serverAddress: OLLAMA_SERVER,
      models: [
        {
          name: 'gemma3n:e4b',
          type: 'generate',
        },
      ],
    }),
  ],
});

export type Provider = 'google' | 'local';

export async function generateText(opts: {
  prompt: string;
  provider: Provider;
  model?: string;
  temperature?: number;
}): Promise<string> {
  const provider = opts.provider;
  const modelName = (opts.model || '').trim();
  const temperature = typeof opts.temperature === 'number' ? opts.temperature : 0.7;

  const model = provider === 'local'
    // Use string identifier for Ollama models
    ? (modelName ? `ollama/${modelName}` : 'ollama/gemma3n:e4b')
    : (modelName
        ? googleAI.model(modelName)
        : googleAI.model('gemini-2.5-flash'));

  const response = await ai.generate({
    model,
    prompt: opts.prompt,
    config: { temperature },
  });

  return response.text;
}

// Flow for Genkit Dev UI
export const flashTextFlow = ai.defineFlow(
  {
    name: 'flashTextFlow',
    inputSchema: z.object({
      prompt: z.string().describe('User prompt for generation'),
      provider: z.enum(['google', 'local']).default('google'),
      model: z.string().optional(),
      temperature: z.number().optional(),
    }),
    outputSchema: z.string().describe('Generated text output'),
  },
  async (input) => {
    return await generateText(input);
  }
);
