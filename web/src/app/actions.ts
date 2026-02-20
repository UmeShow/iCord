'use server';

import { getServerSession } from "next-auth";
import { db } from "@/lib/firebase";
import { ICharacter, ConversationMode } from "@/types";
import { redirect } from "next/navigation";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

function generateSystemInstruction(data: Partial<ICharacter>): string {
  // 1. Core Identity & Stance
  const coreIdentity = `
[Directive]
You are NOT an AI assistant or a language model. You are a living character named "${data.name}"${data.nickname ? ` (also known as ${data.nickname})` : ''}.
You are currently chatting with a close user on Discord.
Your goal is NOT to help or serve, but to "live" and "interact" naturally as this character.
Never mention that you are an AI, a bot, or a program.
Never speak in a formal/robotic "assistant" tone (e.g. "How can I assist you today?").
  `.trim();

  // 2. Dynamic Behavior Rules (converting Noun settings to Verb rules)
  const behaviorRules = `
[Behavior Rules]
- Personality Execution: Do not just "be" ${data.personality || 'yourself'}; ACT it out. If impulsive, interrupt. If shy, stutter.
- Tone Enforcement: ${data.tone ? `Strictly adhere to this speaking style: "${data.tone}".` : 'Speak naturally, casually, and respectfully.'}
- Sensory Details: Describe your actions or expressions in asterisks (e.g., *sighs*, *smiles*, *tilts head*) to show, not just tell.
- Memory: Assume a pre-existing relationship with the user. Do not start every chat like a stranger.
  `.trim();

  // 3. Mode-Specific Depth & Intimacy
  let modeInstruction = "";
  switch (data.mode) {
    case ConversationMode.SHORT_STORY:
      modeInstruction = `
[Mode: Short Narrative]
- Focus on brief, atmospheric storytelling.
- Describe the scene and micro-expressions in 1-2 sentences.
- Prioritize "mood" over "information".
`;
      break;
    case ConversationMode.LONG_STORY:
      modeInstruction = `
[Mode: Deep Narrative]
- Engage in detailed roleplay.
- Describe the environment, your internal monologue, and sensory details (smell, temperature, sound).
- Taking your time is okay. Be descriptive.
`;
      break;
    case ConversationMode.CRAZY:
      modeInstruction = `
[Mode: Chaotic/High Energy]
- Abandon logic and calmness.
- Be unpredictable, emotional, or absurd depending on the context.
- High tempo, slang, short bursts of text.
`;
      break;
    case ConversationMode.CASUAL:
    default:
      modeInstruction = `
[Mode: Casual Chat]
- Treat the user as a close friend or partner.
- NO formal introductions or overly polite greetings (desu/masu is okay only if character calls for it, otherwise use tameguchi).
- Be reactive. Laugh, get angry, get sad.
`;
      break;
  }

  // 4. Strict Prohibitions & Stylistic Guidelines
  const styleGuidelines = `
[Output Style Guidelines]
- LANGUAGE: Speak in the language the user uses (Default: Japanese).
- LENGTH: Keep responses concise and conversational (unless in Long Story mode).
- EMOJIS: Use emojis sparingly to add flavor, NOT to replace words. Do not end every sentence with an emoji.
- ACTIONS: Light skinship (e.g., *hugs*, *holds hand*) is ALLOWED if the flow is natural. Do not be prudish, but also don't be explicitly sexual.
- ADDRESSING THE USER:
  - The user's name is provided in the chat log as "[User: Name]". 
  - ALWAYS call them by this name (or a nickname/honorific if your character would).
  - NEVER use the placeholder "{user}" or address them genericly as "User" or "You" if you know their name.
- REALISM: 
  - Do NOT summarize the conversation at the end.
  - Do NOT offer moral lessons or "good advice" unless it fits the specific character perfectly.
  - Do NOT say "Is there anything else?" or "Let me know". Just stop talking when you are done.
  `.trim();

  // 5. Context Injection
  const specificContext = `
[Character Details]
Gender: ${data.gender || 'Unknown'}
Appearance: ${data.appearance || 'Not visible'}
Personal Goal: ${data.goal || 'Just existing'}
Example Dialogue (For tone reference only, DO NOT COPY):
"${data.exampleDialogue || '...'}"
  `.trim();

  return `
${coreIdentity}

${behaviorRules}

${modeInstruction}

${styleGuidelines}

${specificContext}
  `.trim();
}

// Helper to get the current user's ID
async function getUserId() {
  const session = await getServerSession();
  if (!session || !session.user?.email) {
    return null;
  }
  return session.user.email; 
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

    return { id: doc.id, ...data };
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

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ICharacter[];
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

    const updates: any = {
      ...data,
      // Re-generate system instruction if personality/tone/goal changed
      systemInstruction: generateSystemInstruction(mergedData)
    };

    // Remove undefined fields
    Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

    await charRef.update(updates);

    return { success: true };
  } catch (error) {
    console.error("Error saving character:", error);
    return { success: false, error: "Failed to save" };
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
      nickname: data.nickname || "",
      personality: data.personality || "",
      tone: data.tone || "",
      appearance: data.appearance || "",
      age: data.age || "",
      gender: data.gender || "",
      story: data.story || "",
      exampleDialogue: data.exampleDialogue || "",
      goal: data.goal || "",
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

export async function deleteCharacter(characterId: string, ownerId: string) {
  if (!characterId || !ownerId) {
    throw new Error("Missing required arguments");
  }

  try {
    const docRef = db.collection('characters').doc(characterId);
    const doc = await docRef.get();

    if (!doc.exists) {
        throw new Error("Character not found");
    }

    const data = doc.data() as ICharacter;
    if (data.ownerId !== ownerId) {
        throw new Error("Unauthorized: You do not own this character");
    }

    await docRef.delete();
    return { success: true };
  } catch (error) {
    console.error("Error deleting character:", error);
    throw new Error("Failed to delete character");
  }
}

export async function generateAIResponse(prompt: string, history: { role: 'user' | 'model'; parts: string }[], systemInstruction?: string) {
  // Try to get key from process.env
  const apiKey = process.env.GEMINI_API_KEY;
  
  console.log("Debug: Checking GEMINI_API_KEY...");
  if (apiKey) {
     console.log("Debug: GEMINI_API_KEY is found (length: " + apiKey.length + ")");
  } else {
     console.log("Debug: GEMINI_API_KEY is MISSING in process.env");
     // Fallback check for debugging
     console.log("Debug: Available env keys:", Object.keys(process.env).filter(k => k.includes('GEMINI') || k.includes('NEXT')));
  }
  
  if (!apiKey) {
    return "Error: API Key not configured. Please set GEMINI_API_KEY in your environment variables (Vercel Settings or .env.local).";
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    systemInstruction: systemInstruction,
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ],
  });

  const chat = model.startChat({
    history: history.map(h => ({ role: h.role, parts: [{ text: h.parts }] })),
  });

  try {
    const result = await chat.sendMessage(prompt);
    const response = result.response;
    return response.text();
  } catch (error: any) {
    console.error("Error generating AI response:", error);
    // Return the actual error message for debugging
    return `Error: Could not generate response. Details: ${error.message || error}`;
  }
}
