import { vi } from 'vitest';

import type { GeneratedImage } from '@/store/types';

export interface MockGeminiConfig {
  delay?: number;
  shouldFail?: boolean;
  errorMessage?: string;
}

const generateMockImage = (prompt: string): GeneratedImage => {
  const now = Date.now();
  return {
    id: `mock-image-${now}-${Math.random().toString(36).slice(2, 9)}` as GeneratedImage['id'],
    dataUrl: 'data:image/png;base64,mockgeneratedimage',
    prompt,
    timestamp: now,
  };
};

export const createGeminiMock = (config: MockGeminiConfig = {}) => {
  const { delay = 100, shouldFail = false, errorMessage = 'Mock API error' } = config;

  return vi.fn(async (prompt: string, _tab: string, _attachments?: File[]): Promise<GeneratedImage> => {
    if (shouldFail) {
      throw new Error(errorMessage);
    }

    await new Promise((resolve) => setTimeout(resolve, delay));

    return generateMockImage(prompt);
  });
};

export const mockGeminiGenerate = createGeminiMock();

export const createFailingGeminiMock = (errorMessage = 'API Error') => {
  return vi.fn(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    throw new Error(errorMessage);
  });
};
