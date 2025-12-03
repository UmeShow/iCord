export interface ICharacter {
  id?: string; // Firestore Document ID
  ownerId: string; // Discord ID of the creator
  name: string;
  botToken?: string; // Discord Bot Token
  clientId?: string; // Discord Client ID
  nickname?: string;
  personality: string;
  tone: string;
  appearance?: string;
  age?: string;
  gender?: string;
  story?: string;
  exampleDialogue?: string;
  goal?: string;
  avatarUrl?: string; // URL to the avatar image
  systemInstruction: string; // Compiled prompt
  isActive?: boolean;
}
