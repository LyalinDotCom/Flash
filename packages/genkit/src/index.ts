import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Note: Ollama plugin is optional and may be added later.
export const ai = genkit({ plugins: [googleAI()] });

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
    // Prefer model helper if available; otherwise string identifier is acceptable.
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
