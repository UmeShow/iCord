import OpenAI from 'openai';
import { config } from '../config/config';

const openai = new OpenAI({
  apiKey: config.xai.apiKey,
  baseURL: 'https://api.x.ai/v1',
});

export type GenerationParams = {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
};

export type PromptPart =
  | { text: string }
  | {
      inlineData: {
        data: string; // base64
        mimeType: string;
      };
    };

export async function generateResponse(
  prompt: string | PromptPart[],
  history: { role: 'user' | 'model'; parts: string }[],
  systemInstruction?: string,
  generationParams?: GenerationParams,
) {
  try {
    const messages: any[] = [];

    // System instruction (without the Gemini safe-guard logic that sometimes triggers filters)
    if (systemInstruction) {
      messages.push({
        role: 'system',
        content: systemInstruction,
      });
    }

    const trimmedHistory = (() => {
      const sliced = (history || []).slice(-50); 
      return sliced;
    })();

    // Map history to OpenAI format
    for (const h of trimmedHistory) {
      messages.push({
        role: h.role === 'model' ? 'assistant' : 'user',
        content: h.parts,
      });
    }

    // Process current prompt
    if (typeof prompt === 'string') {
      messages.push({
        role: 'user',
        content: prompt,
      });
    } else {
      // Prompt with image/vision format
      const contentParts: any[] = [];
      for (const part of prompt) {
        if ('text' in part) {
          contentParts.push({ type: 'text', text: part.text });
        } else if ('inlineData' in part) {
          contentParts.push({
            type: 'image_url',
            image_url: {
              url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
            },
          });
        }
      }
      messages.push({
        role: 'user',
        content: contentParts,
      });
    }

    // Call Grok API using OpenAI SDK
    // Note: Grok has fewer filters by design, so no safetySettings are needed!
    const result = await openai.chat.completions.create({
      model: config.xai.model,
      messages: messages,
      temperature: generationParams?.temperature ?? 0.7,
      top_p: generationParams?.topP ?? 0.9,
      max_tokens: generationParams?.maxOutputTokens ?? 1024,
    });

    return result.choices?.[0]?.message?.content || "";
  } catch (error) {
    console.error('Error generating response with Grok:', error);
    throw error;
  }
}
