export enum ConversationMode {
  SHORT_STORY = 'SHORT_STORY',
  LONG_STORY = 'LONG_STORY',
  CASUAL = 'CASUAL',
  CRAZY = 'CRAZY',
  CUSTOM = 'CUSTOM',
}

export interface ICharacter {
  id?: string; // Firestore Document ID
  ownerId: string;
  name: string;
  botToken?: string; // Discord Bot Token (optional)
  clientId?: string; // Discord Client ID (optional, for invite link)
  discordTokenRequired?: boolean; // Whether Discord bot is required (true) or web-only mode (false)
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

  /**
   * Web-triggered "wack" support (reload config + reset memory).
   * Web writes a new token; bot detects the change and resets.
   */
  wackToken?: string;
  wackRequestedAt?: unknown;
  wackRequestedBy?: string;
  wackAppliedAt?: unknown;
  goal?: string;
  /** Custom instruction/rules applied when mode=CUSTOM. */
  customRules?: string;
  avatarUrl?: string;

  /** NSFW mode (adults-only / suggestive allowed, explicit prohibited). */
  nsfwEnabled?: boolean;
  nsfwConsentedAt?: unknown;
  nsfwConsentedBy?: string;
  systemInstruction: string;
  isActive: boolean; // Is the bot currently running?
  mode?: ConversationMode;
}

export interface IUser {
  uid: string; // Firebase Auth UID (same as Discord ID usually)
  customId: string; // Unique search ID (e.g., @umeshow)
  displayName: string;
  avatarUrl?: string;
  bio?: string; // User bio/description
  friends: string[]; // List of friend UIDs
  friendRequestsSent: string[]; // List of UIDs
  friendRequestsReceived: string[]; // List of UIDs
  createdAt: unknown; // Firestore Timestamp
}
