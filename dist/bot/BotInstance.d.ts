import { ICharacter } from '../database/models/Character';
export declare class BotInstance {
    private client;
    private character;
    private isRunning;
    private lastMessageTime;
    constructor(character: ICharacter);
    private setupEvents;
    start(): Promise<void>;
    stop(): Promise<void>;
    get currentToken(): string | undefined;
    updateCharacter(character: ICharacter): void;
    private updateAvatar;
    private handleMessage;
    private checkConsent;
    private grantConsent;
    private updateLastInteraction;
    private isRateLimited;
    private fetchMessageHistory;
}
//# sourceMappingURL=BotInstance.d.ts.map