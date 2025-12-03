'use server';

import { getServerSession } from "next-auth";
import { db } from "@/lib/firebase";
import { ICharacter } from "@/types";
import { redirect } from "next/navigation";

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

    const updates: any = {
      ...data,
      // Re-generate system instruction if personality/tone/goal changed
      systemInstruction: `
Role: You are a Discord bot named "${data.name || currentData.name}"${(data.nickname || currentData.nickname) ? ` (nickname: ${data.nickname || currentData.nickname})` : ''}.
Personality: ${data.personality || currentData.personality}
Speaking Style/Tone: ${data.tone || currentData.tone}
Goal: ${data.goal || currentData.goal}

Instructions:
- You are chatting with users on Discord.
- Maintain your persona at all times.
- Respond in the language the user speaks (default to Japanese if unsure).
- Keep responses concise and suitable for a chat interface.
- Do not break character.
`.trim()
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
      systemInstruction: `
Role: You are a Discord bot named "${data.name}"${data.nickname ? ` (nickname: ${data.nickname})` : ''}.
Personality: ${data.personality}
Speaking Style/Tone: ${data.tone}
Goal: ${data.goal}

Instructions:
- You are chatting with users on Discord.
- Maintain your persona at all times.
- Respond in the language the user speaks (default to Japanese if unsure).
- Keep responses concise and suitable for a chat interface.
- Do not break character.
`.trim(),
      isActive: true,
    };

    const docRef = await charactersRef.add(characterData);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error creating character:", error);
    return { success: false, error: "Failed to create" };
  }
}
