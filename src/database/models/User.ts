export interface IUser {
  discordId: string;
  hasConsented: boolean;
  consentDate: Date;
  lastInteraction: Date;
}
