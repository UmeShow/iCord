"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateResponse = generateResponse;
const generative_ai_1 = require("@google/generative-ai");
const config_1 = require("../config/config");
const genAI = new generative_ai_1.GoogleGenerativeAI(config_1.config.gemini.apiKey);
async function generateResponse(prompt, history, systemInstruction) {
    try {
        // Create a model instance specific to this request to include the character's system instruction
        const model = genAI.getGenerativeModel({
            model: config_1.config.gemini.model,
            ...(systemInstruction ? { systemInstruction } : {}),
            safetySettings: [
                {
                    category: generative_ai_1.HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold: generative_ai_1.HarmBlockThreshold.BLOCK_ONLY_HIGH,
                },
                {
                    category: generative_ai_1.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold: generative_ai_1.HarmBlockThreshold.BLOCK_ONLY_HIGH,
                },
                {
                    category: generative_ai_1.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                    threshold: generative_ai_1.HarmBlockThreshold.BLOCK_ONLY_HIGH, // Allow "light skinship"
                },
                {
                    category: generative_ai_1.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    threshold: generative_ai_1.HarmBlockThreshold.BLOCK_ONLY_HIGH,
                },
            ],
        });
        const chat = model.startChat({
            history: history.map(h => ({ role: h.role, parts: [{ text: h.parts }] })),
        });
        const result = await chat.sendMessage(prompt);
        const response = result.response;
        return response.text();
    }
    catch (error) {
        console.error('Error generating response:', error);
        throw error; // Re-throw to allow caller (BotInstance) to handle retries or fallback
    }
}
//# sourceMappingURL=gemini.js.map