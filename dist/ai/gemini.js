"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateResponse = generateResponse;
const generative_ai_1 = require("@google/generative-ai");
const config_1 = require("../config/config");
const genAI = new generative_ai_1.GoogleGenerativeAI(config_1.config.gemini.apiKey);
async function generateResponse(prompt, history, systemInstruction, generationParams) {
    try {
        // The system instruction from Web/Firestore already contains comprehensive persona guidelines
        // Only add minimal tone-locking if system instruction exists
        const toneLockerSuffix = systemInstruction ? `
[VOICE LOCK - CRITICAL]
Before sending: (1) Does this sound like the character? (2) Consistent with history? (3) Not mentioning being AI? If no to any, rewrite.
    `.trim() : '';
        const effectiveSystemInstruction = systemInstruction
            ? `${systemInstruction}\n\n${toneLockerSuffix}`
            : undefined;
        const trimmedHistory = (() => {
            const sliced = (history || []).slice(-20);
            while (sliced.length > 0 && sliced[0].role === 'model')
                sliced.shift();
            return sliced;
        })();
        const generationConfig = {};
        if (generationParams) {
            if (typeof generationParams.temperature === 'number')
                generationConfig.temperature = generationParams.temperature;
            if (typeof generationParams.topP === 'number')
                generationConfig.topP = generationParams.topP;
            if (typeof generationParams.topK === 'number')
                generationConfig.topK = generationParams.topK;
            if (typeof generationParams.maxOutputTokens === 'number')
                generationConfig.maxOutputTokens = generationParams.maxOutputTokens;
        }
        // Create a model instance specific to this request to include the character's system instruction
        const model = genAI.getGenerativeModel({
            model: config_1.config.gemini.model,
            ...(effectiveSystemInstruction ? { systemInstruction: effectiveSystemInstruction } : {}),
            ...(Object.keys(generationConfig).length ? { generationConfig } : {}),
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
            history: trimmedHistory.map(h => ({ role: h.role, parts: [{ text: h.parts }] })),
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