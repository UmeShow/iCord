import { db } from './firebase';
import { IConversation, IConversationMessage, CONVERSATION_CONFIG } from './models/Conversation';

export class ConversationService {
  private static generateDocId(characterId: string, userId: string, guildId?: string): string {
    return `${characterId}_${userId}_${guildId || 'dm'}`;
  }

  /**
   * Save a message to the conversation history in Firestore
   */
  static async saveMessage(
    characterId: string,
    userId: string,
    userName: string,
    role: 'user' | 'model',
    content: string,
    guildId?: string | null,
    channelId?: string | null,
  ): Promise<void> {
    try {
      const docId = this.generateDocId(characterId, userId, guildId || undefined);
      const conversationRef = db.collection('conversations').doc(docId);
      const now = new Date();

      const newMessage: IConversationMessage = {
        timestamp: now,
        role,
        content,
        userId,
        userName,
      };

      await conversationRef.update({
        lastUpdated: now,
        messageCount: (await conversationRef.get()).data()?.messageCount ?? 0 + 1,
        messages: (await conversationRef.get()).data()?.messages ?? [],
        'metadata.lastUpdated': now,
        ...(role === 'user' && { 'metadata.lastUserMessage': content }),
        ...(role === 'model' && { 'metadata.lastBotMessage': content }),
      });

      // Actually, we need to use a transaction or batch to handle array updates properly
      await db.runTransaction(async (transaction) => {
        const docData = await transaction.get(conversationRef);
        const existingMessages = docData.exists ? docData.data()?.messages || [] : [];

        // Keep only the last MAX_MESSAGES_PER_DOCUMENT
        const updatedMessages = [...existingMessages, newMessage].slice(
          -CONVERSATION_CONFIG.MAX_MESSAGES_PER_DOCUMENT
        );

        transaction.set(
          conversationRef,
          {
            characterId,
            userId,
            guildId: guildId || null,
            channelId: channelId || null,
            lastUpdated: now,
            messageCount: updatedMessages.length,
            messages: updatedMessages,
            metadata: {
              createdAt: docData.exists ? docData.data()?.metadata?.createdAt : now,
              lastUserMessage: role === 'user' ? content : docData.data()?.metadata?.lastUserMessage,
              lastBotMessage: role === 'model' ? content : docData.data()?.metadata?.lastBotMessage,
            },
          },
          { merge: true }
        );
      });

      console.log(
        `[ConversationService] Saved ${role} message for character ${characterId}, user ${userId}`
      );
    } catch (error) {
      console.error(
        `[ConversationService] Error saving message (char: ${characterId}, user: ${userId}):`,
        error
      );
    }
  }

  /**
   * Retrieve conversation history for building context
   */
  static async getHistory(
    characterId: string,
    userId: string,
    guildId?: string | null,
    limit: number = CONVERSATION_CONFIG.CONTEXT_WINDOW
  ): Promise<{ role: 'user' | 'model'; parts: string }[]> {
    try {
      const docId = this.generateDocId(characterId, userId, guildId || undefined);
      const docSnapshot = await db.collection('conversations').doc(docId).get();

      if (!docSnapshot.exists) {
        console.log(`[ConversationService] No history found for character ${characterId}, user ${userId}`);
        return [];
      }

      const data = docSnapshot.data() as IConversation;
      const messages = data.messages || [];

      // Return only the last `limit` messages, formatted for Gemini
      const contextMessages = messages
        .slice(-limit)
        .map((msg) => ({
          role: msg.role,
          parts: `[${msg.role === 'user' ? 'User: ' + msg.userName : msg.userName}] ${msg.content}`,
        }));

      console.log(
        `[ConversationService] Retrieved ${contextMessages.length} messages for character ${characterId}, user ${userId}`
      );

      return contextMessages;
    } catch (error) {
      console.error(
        `[ConversationService] Error retrieving history (char: ${characterId}, user: ${userId}):`,
        error
      );
      return [];
    }
  }

  /**
   * Clear conversation history (e.g., when user runs /wack)
   */
  static async clearHistory(characterId: string, userId: string, guildId?: string | null): Promise<void> {
    try {
      const docId = this.generateDocId(characterId, userId, guildId || undefined);
      await db.collection('conversations').doc(docId).delete();
      console.log(
        `[ConversationService] Cleared history for character ${characterId}, user ${userId}`
      );
    } catch (error) {
      console.error(
        `[ConversationService] Error clearing history (char: ${characterId}, user: ${userId}):`,
        error
      );
    }
  }

  /**
   * Delete old conversations (older than RETENTION_DAYS)
   */
  static async deleteOldConversations(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - CONVERSATION_CONFIG.MESSAGE_RETENTION_DAYS);

      const snapshot = await db
        .collection('conversations')
        .where('lastUpdated', '<', cutoffDate)
        .get();

      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      console.log(
        `[ConversationService] Deleted ${snapshot.size} old conversations (older than ${CONVERSATION_CONFIG.MESSAGE_RETENTION_DAYS} days)`
      );
    } catch (error) {
      console.error('[ConversationService] Error deleting old conversations:', error);
    }
  }
}
