import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { config } from '../config/config';

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

const model = genAI.getGenerativeModel({
  model: config.gemini.model,
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ],
});

export async function generateResponse(prompt: string, history: { role: 'user' | 'model'; parts: string }[], systemInstruction?: string) {
  try {
    // Note: systemInstruction is supported in newer Gemini models/SDKs. 
    // If using an older version, prepend it to the history or the first prompt.
    // For this implementation, we will prepend it to the chat session if provided.
    
    const chat = model.startChat({
      history: [
        ...(systemInstruction ? [{ role: 'user', parts: [{ text: `System Instruction: ${systemInstruction}` }] }, { role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] }] : []),
        ...history.map(h => ({ role: h.role, parts: [{ text: h.parts }] }))
      ] as any, // Type casting for simplicity with the SDK types
    });

    const result = await chat.sendMessage(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating response:', error);
    return "Sorry, I couldn't generate a response at this time. Please try again later.";
  }
}
