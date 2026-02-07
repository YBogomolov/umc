import { GoogleGenerativeAI, type Part } from '@google/generative-ai';

import { BACK_VIEW_SYSTEM_PROMPT, BASE_VIEW_SYSTEM_PROMPT, FRONTAL_VIEW_SYSTEM_PROMPT } from '@/prompts';

export type GenerationType = 'frontal' | 'back' | 'base';

interface GenerationResult {
  success: boolean;
  dataUrl?: string;
  error?: string;
}

interface GenerateImageOptions {
  apiKey: string;
  type: GenerationType;
  userPrompt: string;
  referenceImageDataUrl?: string;
  modelName?: string;
}

const dataUrlToBase64 = (dataUrl: string): { mimeType: string; data: string } => {
  const [header, data] = dataUrl.split(',');
  const mimeMatch = /:(.*?);/.exec(header);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
  return { mimeType, data };
};

const buildPrompt = (type: GenerationType, userPrompt: string): string => {
  switch (type) {
    case 'frontal':
      return `${FRONTAL_VIEW_SYSTEM_PROMPT}\n\nUser request: ${userPrompt}`;
    case 'back':
      return `${BACK_VIEW_SYSTEM_PROMPT}\n\nUser request: ${userPrompt}`;
    case 'base':
      return `${BASE_VIEW_SYSTEM_PROMPT}\n\nUser request: ${userPrompt}`;
  }
};

export const generateImage = async (options: GenerateImageOptions): Promise<GenerationResult> => {
  const { apiKey, type, userPrompt, referenceImageDataUrl, modelName } = options;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: modelName ?? 'gemini-2.5-flash-image',
      generationConfig: {
        responseModalities: ['Text', 'Image'],
      } as Record<string, unknown>,
    });

    const promptText = buildPrompt(type, userPrompt);

    const parts: Part[] = [];

    // For back view: include frontal image as reference
    if (type === 'back' && referenceImageDataUrl) {
      const { mimeType, data } = dataUrlToBase64(referenceImageDataUrl);
      parts.push({
        inlineData: { mimeType, data },
      });
    }

    parts.push({ text: promptText });

    const response = await model.generateContent(parts);
    const result = response.response;

    const candidates = result.candidates;
    if (!candidates || candidates.length === 0) {
      return { success: false, error: 'No response generated' };
    }

    const responseParts = candidates[0].content?.parts;
    if (!responseParts) {
      return { success: false, error: 'No content in response' };
    }

    for (const part of responseParts) {
      if ('inlineData' in part && part.inlineData) {
        const { mimeType, data } = part.inlineData;
        const dataUrl = `data:${mimeType};base64,${data}`;
        return { success: true, dataUrl };
      }
    }

    return { success: false, error: 'No image in response' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return { success: false, error: message };
  }
};

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};
