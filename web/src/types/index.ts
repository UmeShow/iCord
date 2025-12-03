export interface ICharacter {
  id?: string; // Firestore Document ID
  ownerId: string;
  name: string;
  botToken: string; // Discord Bot Token
  clientId: string; // Discord Client ID (for invite link)
  nickname?: string;
  personality: string;
  tone: string;
  appearance?: string;
  age?: string;
  gender?: string;
  story?: string;
  exampleDialogue?: string;
  goal?: string;
  avatarUrl?: string;
  systemInstruction: string;
  isActive: boolean; // Is the bot currently running?
}
