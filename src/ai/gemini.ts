import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { config } from '../config/config';

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

export async function generateResponse(prompt: string, history: { role: 'user' | 'model'; parts: string }[], systemInstruction?: string) {
  try {
    // Create a model instance specific to this request to include the character's system instruction
    const model = genAI.getGenerativeModel({
      model: config.gemini.model,
      ...(systemInstruction ? { systemInstruction } : {}),
      safetySettings: [
        {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH, // Allow "light skinship"
        },
        {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
    });

    const chat = model.startChat({
      history: history.map(h => ({ role: h.role, parts: [{ text: h.parts }] })),
    });

    const result = await chat.sendMessage(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating response:', error);
    throw error; // Re-throw to allow caller (BotInstance) to handle retries or fallback
  }
}
