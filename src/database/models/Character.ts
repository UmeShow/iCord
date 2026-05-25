export enum ConversationMode {
  SHORT_STORY = 'SHORT_STORY',
  LONG_STORY = 'LONG_STORY',
  CASUAL = 'CASUAL',
  CRAZY = 'CRAZY',
  CUSTOM = 'CUSTOM',
}

export interface ICharacter {
  id?: string; // Firestore Document ID
  ownerId: string; // Discord ID of the creator
  name: string;
  botToken?: string; // Discord Bot Token
  clientId?: string; // Discord Client ID
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
  goal?: string;
  /** Custom instruction/rules applied when mode=CUSTOM. */
  customRules?: string;
  avatarUrl?: string; // URL to the avatar image

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

  systemInstruction: string; // Compiled prompt
  isActive?: boolean;
  mode?: ConversationMode;
}
