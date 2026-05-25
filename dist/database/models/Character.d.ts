export declare enum ConversationMode {
    SHORT_STORY = "SHORT_STORY",
    LONG_STORY = "LONG_STORY",
    CASUAL = "CASUAL",
    CRAZY = "CRAZY"
}
export interface ICharacter {
    id?: string;
    ownerId: string;
    name: string;
    botToken?: string;
    clientId?: string;
    nickname?: string;
    personality: string;
    tone: string;
    appearance?: string;
    age?: string;
    gender?: string;
    story?: string;
    exampleDialogue?: string;
    goal?: string;
    avatarUrl?: string;
    systemInstruction: string;
    isActive?: boolean;
    mode?: ConversationMode;
}
//# sourceMappingURL=Character.d.ts.map