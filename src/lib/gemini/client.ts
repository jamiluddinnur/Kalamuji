import 'server-only';
import { GoogleGenAI } from '@google/genai';
import { serverConfig } from '../config';

let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: serverConfig.gemini.apiKey });
  }
  return aiClient;
}

export class UpstreamTimeoutError extends Error {
  constructor(message = 'Permintaan ke layanan AI melewati batas waktu.') {
    super(message);
    this.name = 'UpstreamTimeoutError';
  }
}

export async function withTimeout<T>(
  promiseFactory: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await promiseFactory(controller.signal);
  } catch (error: unknown) {
    if (
      controller.signal.aborted ||
      (error instanceof Error && error.name === 'AbortError')
    ) {
      throw new UpstreamTimeoutError();
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
