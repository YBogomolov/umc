import { GoogleGenerativeAI, type Part } from '@google/generative-ai';

import { BACK_VIEW_SYSTEM_PROMPT, BASE_VIEW_SYSTEM_PROMPT, FRONTAL_VIEW_SYSTEM_PROMPT } from '@/prompts';

import { ImageId } from './db';

export type GenerationType = 'frontal' | 'back' | 'base';

export interface Attachment {
  readonly id: string;
  readonly fileName: string;
  readonly dataUrl: string;
  readonly mimeType: string;
}

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
  attachments?: readonly Attachment[];
  collectionDescription?: string;
}

export const dataUrlToBase64 = (dataUrl: string): { mimeType: string; data: string } => {
  const [header, data] = dataUrl.split(',');
  const mimeMatch = /:(.*?);/.exec(header);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
  return { mimeType, data };
};

const buildPrompt = (type: GenerationType, userPrompt: string, collectionDescription?: string): string => {
  const basePrompt = ((): string => {
    switch (type) {
      case 'frontal':
        return `${FRONTAL_VIEW_SYSTEM_PROMPT}\n\nUser request: ${userPrompt}`;
      case 'back':
        return `${BACK_VIEW_SYSTEM_PROMPT}\n\nUser request: ${userPrompt}`;
      case 'base':
        return `${BASE_VIEW_SYSTEM_PROMPT}\n\nUser request: ${userPrompt}`;
    }
  })();

  if ((type === 'frontal' || type === 'back') && collectionDescription?.trim()) {
    return `${basePrompt}

The character whose image you will be generating belongs to a collection with the following description:

<description>
${collectionDescription.trim()}
</description>

If this information contains any hints about visual representation of the character (e.g., clothes, posture and physical complexion, belonging to a certain social group that implies very specific visual attributes, armour, weapons, hair style, etc.) — you absolutely MUST take this into account when creating the image.`;
  }

  return basePrompt;
};

export const generateImage = async (options: GenerateImageOptions): Promise<GenerationResult> => {
  const { apiKey, type, userPrompt, referenceImageDataUrl, modelName, attachments, collectionDescription } = options;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: modelName ?? 'gemini-2.5-flash-image',
      generationConfig: {
        responseModalities: ['Text', 'Image'],
      } as Record<string, unknown>,
    });

    const promptText = buildPrompt(type, userPrompt, collectionDescription);

    const parts: Part[] = [];

    // Add user attachments as inline data parts first
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        const { mimeType, data } = dataUrlToBase64(attachment.dataUrl);
        parts.push({
          inlineData: { mimeType, data },
        });
      }
    }

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

export const generateImageId = (): ImageId => `${Date.now()}-${Math.random().toString(36).substring(2, 9)}` as ImageId;
