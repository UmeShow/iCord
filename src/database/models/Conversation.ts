export interface IConversationMessage {
  timestamp: Date;
  role: 'user' | 'model';
  content: string;
  userId: string;
  userName: string;
}

export interface IConversation {
  id?: string; // Firestore Document ID (characterId_userId_guildId)
  characterId: string;
  userId: string;
  guildId?: string; // For guild-based conversations
  channelId?: string; // For channel-based conversations
  lastUpdated: Date;
  messageCount: number;
  messages: IConversationMessage[]; // Keep last N messages for context window
  metadata?: {
    createdAt?: Date;
    lastUserMessage?: string;
    lastBotMessage?: string;
  };
}

// Configuration for conversation history management
export const CONVERSATION_CONFIG = {
  MAX_MESSAGES_PER_DOCUMENT: 200, // Max messages to store in a single document
  MESSAGE_RETENTION_DAYS: 30, // Delete conversations older than this
  CONTEXT_WINDOW: 50, // Number of recent messages to send to AI
} as const;
