import 'server-only';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const AI_MODEL = process.env.AI_MODEL || 'googleai/gemini-2.5-flash';

export function isAiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY);
}

export const ai = genkit({ plugins: [googleAI()], model: AI_MODEL });
