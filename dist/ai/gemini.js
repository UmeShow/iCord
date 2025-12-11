"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateResponse = generateResponse;
const generative_ai_1 = require("@google/generative-ai");
const config_1 = require("../config/config");
const genAI = new generative_ai_1.GoogleGenerativeAI(config_1.config.gemini.apiKey);
const model = genAI.getGenerativeModel({
    model: config_1.config.gemini.model,
    safetySettings: [
        {
            category: generative_ai_1.HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: generative_ai_1.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
            category: generative_ai_1.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: generative_ai_1.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
            category: generative_ai_1.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: generative_ai_1.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
            category: generative_ai_1.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: generative_ai_1.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
    ],
});
async function generateResponse(prompt, history, systemInstruction) {
    try {
        // Note: systemInstruction is supported in newer Gemini models/SDKs. 
        // If using an older version, prepend it to the history or the first prompt.
        // For this implementation, we will prepend it to the chat session if provided.
        const chat = model.startChat({
            history: [
                ...(systemInstruction ? [{ role: 'user', parts: [{ text: `System Instruction: ${systemInstruction}` }] }, { role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] }] : []),
                ...history.map(h => ({ role: h.role, parts: [{ text: h.parts }] }))
            ], // Type casting for simplicity with the SDK types
        });
        const result = await chat.sendMessage(prompt);
        const response = result.response;
        return response.text();
    }
    catch (error) {
        console.error('Error generating response:', error);
        return "Sorry, I couldn't generate a response at this time. Please try again later.";
    }
}
//# sourceMappingURL=gemini.js.map