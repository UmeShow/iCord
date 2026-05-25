export type GenerationParams = {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
};
export type PromptPart = {
    text: string;
} | {
    inlineData: {
        data: string;
        mimeType: string;
    };
};
export declare function generateResponse(prompt: string | PromptPart[], history: {
    role: 'user' | 'model';
    parts: string;
}[], systemInstruction?: string, generationParams?: GenerationParams): Promise<string>;
//# sourceMappingURL=gemini.d.ts.map