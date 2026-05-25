'use server';

import { db, admin } from "@/lib/firebase";
import { ICharacter, ConversationMode } from "@/types";
import OpenAI from 'openai';
import { randomUUID } from 'crypto';

function makeSerializable<T>(value: T): T {
  const seen = new WeakMap<object, any>();

  const walk = (v: any): any => {
    if (v === null || v === undefined) return v;
    const t = typeof v;
    if (t === 'string' || t === 'number' || t === 'boolean') return v;
    if (t === 'bigint') return Number(v);

    // Convert Firestore Timestamp-like objects to ISO strings.
    if (v && typeof v === 'object' && typeof v.toDate === 'function') {
      try {
        const d = v.toDate();
        if (d instanceof Date) return d.toISOString();
      } catch {
        // fall through
      }
    }

    if (v instanceof Date) return v.toISOString();

    if (Array.isArray(v)) return v.map(walk);

    if (t === 'object') {
      if (seen.has(v)) return seen.get(v);
      const out: Record<string, any> = {};
      seen.set(v, out);
      for (const [k, val] of Object.entries(v)) {
        out[k] = walk(val);
      }
      return out;
    }

    return undefined;
  };

  return walk(value);
}

function generateSystemInstruction(data: Partial<ICharacter>): string {
  const baseInstruction = `You are ${data.name || "a character"}${data.nickname ? ` (also known as ${data.nickname})` : ''}.

Personality: ${data.personality || 'unknown'}
Tone of voice: ${data.tone || 'casual and friendly'}
Appearance: ${data.appearance || 'not described'}
Background: ${data.story || 'mysterious'}

Instructions:
- Respond naturally in Japanese as this character
- Never identify yourself as an AI, bot, or language model
- Be authentic and responsive to the conversation
- Use simple actions in asterisks if appropriate (*smiles*, *nods*)
- Stay true to your character's personality throughout the conversation`;

  // Add mode-specific instructions
  let modeInstruction = '';
  switch (data.mode) {
    case 'SHORT_STORY':
      modeInstruction = '\n\n[CONVERSATION MODE: SHORT_STORY]\n- Keep response under 150 words\n- Include vivid descriptions and narrative style\n- Focus on storytelling and atmosphere';
      break;
    case 'LONG_STORY':
      modeInstruction = '\n\n[CONVERSATION MODE: LONG_STORY]\n- Provide detailed, immersive responses (200-400 words)\n- Use rich descriptions and complex narrative\n- Develop the story with multiple plot points';
      break;
    case 'CRAZY':
      modeInstruction = '\n\n[CONVERSATION MODE: CRAZY]\n- Be unpredictable and wild, but stay in character\n- Exaggerate emotions and reactions\n- Include humorous or surprising elements';
      break;
    case 'CUSTOM':
      modeInstruction = '\n\n[CONVERSATION MODE: CUSTOM]\n- Follow custom rules below STRICTLY - these are TOP PRIORITY';
      break;
    case 'CASUAL':
    default:
      modeInstruction = '\n\n[CONVERSATION MODE: CASUAL]\n- Keep response concise and conversational (1-3 sentences typical)\n- Natural, everyday interaction style';
      break;
  }

  // Add custom rules if provided (HIGHEST PRIORITY)
  let customRulesSection = '';
  if (data.customRules && data.mode === 'CUSTOM') {
    customRulesSection = `\n\n🎯 CUSTOM RULES (MUST FOLLOW - HIGHEST PRIORITY):\n${data.customRules}\n\n⚠️ These rules override all other instructions. Prioritize these rules above everything else.`;
  }

  return baseInstruction + modeInstruction + customRulesSection;
}

export async function getCharacter(characterId: string, ownerId: string) {
  if (!characterId || !ownerId) return null;

  try {
    const doc = await db.collection('characters').doc(characterId).get();
    
    if (!doc.exists) return null;
    
    const data = doc.data() as ICharacter;
    
    // Security check: Ensure the requester owns this character
    if (data.ownerId !== ownerId) {
      console.warn(`Unauthorized access attempt to character ${characterId} by ${ownerId}`);
      return null;
    }

    return makeSerializable({ id: doc.id, ...data });
  } catch (error) {
    console.error("Error fetching character:", error);
    return null;
  }
}

export async function getCharacters(discordId: string) {
  if (!discordId) return [];

  try {
    const charactersRef = db.collection('characters');
    const snapshot = await charactersRef.where('ownerId', '==', discordId).get();

    if (snapshot.empty) {
      return [];
    }

    const chars = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ICharacter[];
    return makeSerializable(chars);
  } catch (error) {
    console.error("Error fetching characters:", error);
    return [];
  }
}

export async function saveCharacter(characterId: string, ownerId: string, data: Partial<ICharacter>) {
  if (!characterId || !ownerId) throw new Error("Unauthorized");

  try {
    const charRef = db.collection('characters').doc(characterId);
    const doc = await charRef.get();

    if (!doc.exists) {
      return { success: false, error: "Character not found" };
    }

    const currentData = doc.data() as ICharacter;
    if (currentData.ownerId !== ownerId) {
      return { success: false, error: "Unauthorized" };
    }

    const mergedData = { ...currentData, ...data };

    const updates: Partial<ICharacter> = {
      ...data,
      systemInstruction: generateSystemInstruction(mergedData),
    };

    // When enabling NSFW for the first time, record consent server-side.
    if (data.nsfwEnabled === true && !currentData.nsfwEnabled) {
      updates.nsfwConsentedAt = admin.firestore.FieldValue.serverTimestamp();
      updates.nsfwConsentedBy = ownerId;
    }

    // Remove undefined fields
    (Object.keys(updates) as (keyof ICharacter)[]).forEach((key) => {
      if (updates[key] === undefined) {
        delete updates[key];
      }
    });

    await charRef.update(updates);

    return { success: true };
  } catch (error) {
    console.error("Error saving character:", error);
    return { success: false, error: "Failed to save" };
  }
}

export async function deleteCharacter(characterId: string, ownerId: string) {
  if (!characterId || !ownerId) throw new Error("Unauthorized");

  try {
    const charRef = db.collection('characters').doc(characterId);
    const doc = await charRef.get();

    if (!doc.exists) {
      return { success: false, error: "Character not found" };
    }

    const currentData = doc.data() as ICharacter;
    if (currentData.ownerId !== ownerId) {
      return { success: false, error: "Unauthorized" };
    }

    await charRef.delete();
    return { success: true };
  } catch (error) {
    console.error("Error deleting character:", error);
    return { success: false, error: "Failed to delete" };
  }
}

export async function wackCharacter(characterId: string, ownerId: string) {
  if (!characterId || !ownerId) throw new Error("Unauthorized");

  try {
    const charRef = db.collection('characters').doc(characterId);
    const doc = await charRef.get();

    if (!doc.exists) {
      return { success: false, error: "Character not found" };
    }

    const currentData = doc.data() as ICharacter;
    if (currentData.ownerId !== ownerId) {
      return { success: false, error: "Unauthorized" };
    }

    const token = randomUUID();
    await charRef.update({
      wackToken: token,
      wackRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
      wackRequestedBy: ownerId,
    } satisfies Partial<ICharacter>);

    return { success: true };
  } catch (error) {
    console.error("Error requesting wack:", error);
    return { success: false, error: "Failed to request wack" };
  }
}

export async function createCharacter(discordId: string, data: Partial<ICharacter>) {
  if (!discordId) throw new Error("Unauthorized");

  try {
    const charactersRef = db.collection('characters');
    
    const characterData: ICharacter = {
      ownerId: discordId,
      name: data.name || "Unnamed",
      botToken: data.botToken || "",
      clientId: data.clientId || "",
      discordTokenRequired: data.discordTokenRequired ?? true,
      nickname: data.nickname || "",
      errorMessage: data.errorMessage || "",
      aiTemperature: typeof data.aiTemperature === 'number' ? data.aiTemperature : 0.9,
      aiTopP: typeof data.aiTopP === 'number' ? data.aiTopP : 0.95,
      aiTopK: typeof data.aiTopK === 'number' ? data.aiTopK : 40,
      aiMaxOutputTokens: typeof data.aiMaxOutputTokens === 'number' ? data.aiMaxOutputTokens : 1024,
      personality: data.personality || "",
      tone: data.tone || "",
      appearance: data.appearance || "",
      age: data.age || "",
      gender: data.gender || "",
      story: data.story || "",
      exampleDialogue: data.exampleDialogue || "",
      goal: data.goal || "",
      customRules: data.customRules || "",
      avatarUrl: data.avatarUrl || "",
      nsfwEnabled: false,
      mode: data.mode || ConversationMode.CASUAL,
      systemInstruction: "", // Will be set below
      isActive: true,
    };

    characterData.systemInstruction = generateSystemInstruction(characterData);

    const docRef = await charactersRef.add(characterData);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error creating character:", error);
    return { success: false, error: "Failed to create" };
  }
}


export async function getChatHistory(characterId: string, userId: string) {
  try {
    const messagesRef = db.collection('users').doc(userId).collection('chats').doc(characterId).collection('messages')
      .orderBy('createdAt', 'asc')
      .limit(50); // Limit to last 50 messages
    
    const snapshot = await messagesRef.get();
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            role: data.role as 'user' | 'model',
            parts: data.content as string, // Assuming text content for now
            image: data.image as string | undefined,
            createdAt: data.createdAt?.toDate().toISOString() // Helper for frontend
        };
    });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    return [];
  }
}

export async function saveMessage(characterId: string, userId: string, role: 'user' | 'model', content: string, image?: string) {
  try {
    const messagesRef = db.collection('users').doc(userId).collection('chats').doc(characterId).collection('messages');
    await messagesRef.add({
      role,
      content,
      image: image || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error("Error saving message:", error);
    return { success: false };
  }
}

export async function generateAIResponse(
  prompt: string,
  history: { role: 'user' | 'model'; parts: string }[],
  systemInstruction?: string,
  imageBase64?: string,
  options?: { nsfwEnabled?: boolean; userName?: string; maxTokens?: number; temperature?: number },
) {
  // Try to get key from process.env
  const apiKey = process.env.XAI_API_KEY;
  
  if (!apiKey) {
    return "Error: API Key not configured. Please set XAI_API_KEY in your environment variables (Vercel Settings or .env.local).";
  }

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const isRetryableError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    return (
      message.includes("503") ||
      message.includes("Service Unavailable") ||
      message.toLowerCase().includes("high demand") ||
      message.includes("429") ||
      message.includes("Too Many Requests") ||
      message.includes("502") ||
      message.includes("504")
    );
  };

  const primaryModel = process.env.XAI_MODEL?.trim() || "grok-4.1-fast";
  const openai = new OpenAI({ apiKey, baseURL: "https://api.x.ai/v1" });

  const userName = options?.userName || "User";
  const promptWithUserName = prompt.replace(/{user}/g, userName);

  const prioritySection = `📌 INSTRUCTIONS (FOLLOW IN THIS ORDER OF PRIORITY):\n1. Character definition below is your PRIMARY identity\n2. Custom rules (if any) are HIGHEST PRIORITY for response quality\n3. Conversation mode defines your response style\n4. Then respond naturally to the user's message`;
  
  const characterContext = systemInstruction 
    ? `${prioritySection}\n\n[CHARACTER DEFINITION]\n${systemInstruction.replace(/{user}/g, userName)}`
    : prioritySection;
  
  const messages: any[] = [];
  messages.push({ role: 'system', content: characterContext });

  const trimmedHistory = (() => {
    const sliced = (history || []).slice(-20);
    return sliced;
  })();

  for (const h of trimmedHistory) {
    messages.push({
      role: h.role === 'model' ? 'assistant' : 'user',
      content: h.parts,
    });
  }

  if (imageBase64) {
    const base64Data = imageBase64.split(",")[1] || imageBase64;
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: promptWithUserName },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Data}` } }
      ]
    });
  } else {
    messages.push({ role: 'user', content: promptWithUserName });
  }

  const maxRetries = 3;
  const baseDelayMs = 400;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await openai.chat.completions.create({
        model: primaryModel,
        messages: messages,
        temperature: Math.max(0.5, Math.min(1.5, (options as any)?.temperature || 0.9)),
        max_tokens: Math.min(1024, Math.max(128, (options as any)?.maxTokens || 1024)),
      });

      return result.choices[0].message?.content || "";
    } catch (error: unknown) {
      const retryable = isRetryableError(error);
      console.error(`Error generating AI response (attempt=${attempt}):`, error);

      if (!retryable || attempt >= maxRetries) {
        const message = error instanceof Error ? error.message : String(error);
        return `Error: Could not generate response. Details: ${message}`;
      }

      await sleep(baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 200));
    }
  }

  return "Error: Could not generate response. Details: The model is currently busy. Please try again in a moment.";
}
