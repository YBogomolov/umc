import { GoogleGenAI, HarmBlockThreshold, HarmCategory, type Part } from '@google/genai';

import {
  BACK_VIEW_SYSTEM_PROMPT,
  BASE_VIEW_SYSTEM_PROMPT,
  DEFAULT_STYLE_PROMPT,
  FRONTAL_VIEW_SYSTEM_PROMPT,
} from '@/prompts';
import { GeminiModel } from '@/store/types';

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
  readonly apiKey: string;
  readonly generationType: GenerationType;
  readonly userPrompt: string;
  readonly referenceImageDataUrl?: string;
  readonly model: GeminiModel;
  readonly attachments?: readonly Attachment[];
  readonly collectionDescription?: string;
  readonly stylePromptOverride?: string;
}

export const dataUrlToBase64 = (dataUrl: string): { mimeType: string; data: string } => {
  const [header, data] = dataUrl.split(',');
  const mimeMatch = /:(.*?);/.exec(header);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
  return { mimeType, data };
};

const buildPrompt = (
  type: GenerationType,
  userPrompt: string,
  collectionDescription?: string,
  stylePromptOverride = '',
): string => {
  const basePrompt = ((): string => {
    switch (type) {
      case 'frontal':
        return `${FRONTAL_VIEW_SYSTEM_PROMPT.replace('$$STYLE$$', stylePromptOverride || DEFAULT_STYLE_PROMPT)}\n\nUser request: ${userPrompt}`;
      case 'back':
        return BACK_VIEW_SYSTEM_PROMPT.replace('$$STYLE$$', stylePromptOverride || DEFAULT_STYLE_PROMPT);
      case 'base':
        return `${BASE_VIEW_SYSTEM_PROMPT.replace('$$STYLE$$', stylePromptOverride || DEFAULT_STYLE_PROMPT)}\n\nUser request: ${userPrompt}`;
    }
  })();

  if (type === 'frontal' && collectionDescription?.trim()) {
    return `${basePrompt}

The character whose image you will be generating belongs to a collection with the following description:

<description>
${collectionDescription.trim()}
</description>

If this information contains any hints about visual representation of the character (e.g., clothes, posture and physical complexion, belonging to a certain social group that implies very specific visual attributes, armour, weapons, hair style, etc.) — you absolutely MUST take this into account when creating the image.`;
  }

  return basePrompt;
};

export const generateImage = async ({
  apiKey,
  generationType,
  userPrompt,
  referenceImageDataUrl,
  model,
  attachments,
  collectionDescription,
  stylePromptOverride,
}: GenerateImageOptions): Promise<GenerationResult> => {
  try {
    const genAI = new GoogleGenAI({ apiKey });

    const promptText = buildPrompt(generationType, userPrompt, collectionDescription, stylePromptOverride);

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
    if (generationType === 'back' && referenceImageDataUrl) {
      const { mimeType, data } = dataUrlToBase64(referenceImageDataUrl);
      parts.push({
        inlineData: { mimeType, data },
      });
    }

    parts.push({ text: promptText });

    const result = await genAI.models.generateContent({
      model,
      contents: parts,
      config: {
        responseModalities: ['IMAGE'],
        candidateCount: 1,
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.OFF,
          },
        ],
      },
    });

    const candidates = result.candidates;
    if (!candidates || candidates.length === 0) {
      return { success: false, error: 'No response generated' };
    }

    const responseParts = candidates[0].content?.parts;
    if (!responseParts) {
      return { success: false, error: 'No content in response' };
    }

    for (const part of responseParts) {
      if (part.inlineData) {
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

export interface EditImageOptions {
  readonly apiKey: string;
  readonly userPrompt: string;
  readonly model: GeminiModel;
  readonly imageParts: ReadonlyArray<{ inlineData: { mimeType: string; data: string } }>;
}

export const editImage = async ({
  apiKey,
  userPrompt,
  model,
  imageParts,
}: EditImageOptions): Promise<GenerationResult> => {
  try {
    const genAI = new GoogleGenAI({ apiKey });

    const parts: Part[] = [...imageParts, { text: userPrompt }];

    const result = await genAI.models.generateContent({
      model,
      contents: parts,
      config: {
        responseModalities: ['IMAGE'],
        candidateCount: 1,
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.OFF,
          },
        ],
      },
    });

    const candidates = result.candidates;
    if (!candidates || candidates.length === 0) {
      return { success: false, error: 'No response generated' };
    }

    const responseParts = candidates[0].content?.parts;
    if (!responseParts) {
      return { success: false, error: 'No content in response' };
    }

    for (const part of responseParts) {
      if (part.inlineData) {
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
