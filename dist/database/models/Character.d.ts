export declare enum ConversationMode {
    SHORT_STORY = "SHORT_STORY",
    LONG_STORY = "LONG_STORY",
    CASUAL = "CASUAL",
    CRAZY = "CRAZY",
    CUSTOM = "CUSTOM"
}
export interface ICharacter {
    id?: string;
    ownerId: string;
    name: string;
    botToken?: string;
    clientId?: string;
    discordTokenRequired?: boolean;
    nickname?: string;
    /** Used for user-facing error replies on Discord (commands/chat). */
    errorMessage?: string;
    /** Gemini generation parameters (per character). */
    aiTemperature?: number;
    aiTopP?: number;
    aiTopK?: number;
    aiMaxOutputTokens?: number;
    personality: string;
    tone: string;
    appearance?: string;
    age?: string;
    gender?: string;
    story?: string;
    exampleDialogue?: string;
    goal?: string;
    /** Custom instruction/rules applied when mode=CUSTOM. */
    customRules?: string;
    avatarUrl?: string;
    /** NSFW mode (adults-only / suggestive allowed, explicit prohibited). */
    nsfwEnabled?: boolean;
    nsfwConsentedAt?: unknown;
    nsfwConsentedBy?: string;
    /**
     * Web-triggered "wack" support (reload config + reset memory).
     * Web writes a new token; bot detects the change and resets.
     */
    wackToken?: string;
    wackRequestedAt?: unknown;
    wackRequestedBy?: string;
    wackAppliedAt?: unknown;
    systemInstruction: string;
    isActive?: boolean;
    mode?: ConversationMode;
}
//# sourceMappingURL=Character.d.ts.map