import { ICharacter } from '../database/models/Character';
export declare class BotInstance {
    private client;
    private character;
    private isRunning;
    private isAutoReply;
    private lastResetTime;
    private lastMessageTime;
    constructor(character: ICharacter);
    private setupEvents;
    private registerCommands;
    private handleInteraction;
    start(): Promise<void>;
    stop(): Promise<void>;
    get currentToken(): string | undefined;
    updateCharacter(character: ICharacter): void;
    private updateAvatar;
    private handleMessage;
    private reloadConfig;
    private checkConsent;
    private grantConsent;
    private updateLastInteraction;
    private isRateLimited;
    private fetchMessageHistory;
}
//# sourceMappingURL=BotInstance.d.ts.map