import { Client, GatewayIntentBits, Message, Partials, ChannelType } from 'discord.js';
import { ICharacter } from '../database/models/Character';
import { generateResponse } from '../ai/gemini';
import { db } from '../database/firebase';
import { IUser } from '../database/models/User';

export class BotInstance {
    private client: Client;
    private character: ICharacter;
    private isRunning: boolean = false;
    // Simple in-memory rate limiting: userId -> timestamp
    private lastMessageTime: Map<string, number> = new Map();

    constructor(character: ICharacter) {
        this.character = character;
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.DirectMessages
            ],
            partials: [Partials.Channel] // Required for DMs
        });

        this.setupEvents();
    }

    private setupEvents() {
        this.client.once('ready', () => {
            console.log(`Bot ${this.character.name} is ready! Logged in as ${this.client.user?.tag}`);
        });

        this.client.on('messageCreate', this.handleMessage.bind(this));
    }

    public async start() {
        if (this.isRunning) return;
        try {
            await this.client.login(this.character.botToken);
            this.isRunning = true;
            
            // Update avatar if needed
            await this.updateAvatar();
        } catch (error) {
            console.error(`Failed to start bot ${this.character.name}:`, error);
        }
    }

    public async stop() {
        if (!this.isRunning) return;
        try {
            await this.client.destroy();
            this.isRunning = false;
            console.log(`Bot ${this.character.name} stopped.`);
        } catch (error) {
            console.error(`Error stopping bot ${this.character.name}:`, error);
        }
    }

    public get currentToken(): string | undefined {
        return this.character.botToken;
    }

    public updateCharacter(character: ICharacter) {
        const oldAvatar = this.character.avatarUrl;
        this.character = character;
        console.log(`Updated character data for ${this.character.name}`);

        // Check if avatar changed
        if (character.avatarUrl !== oldAvatar) {
            this.updateAvatar();
        }
    }

    private async updateAvatar() {
        if (!this.character.avatarUrl || !this.client.user) return;

        try {
            console.log(`Updating avatar for ${this.character.name}...`);
            await this.client.user.setAvatar(this.character.avatarUrl);
            console.log(`Avatar updated for ${this.character.name}`);
        } catch (error) {
            console.error(`Failed to update avatar for ${this.character.name}:`, error);
            // Discord has strict rate limits for avatar changes (e.g. 2 times per hour)
            // We log the error but don't crash the bot
        }
    }

    private async handleMessage(message: Message) {
        if (message.author.bot) return;

        // Check if mentioned or DM
        const isDM = message.channel.type === ChannelType.DM;
        const isMentioned = this.client.user ? message.mentions.users.has(this.client.user.id) : false;

        if (!isDM && !isMentioned) return;

        // 1. Check Consent
        const hasConsented = await this.checkConsent(message.author.id);
        if (!hasConsented) {
            // Check if they are trying to consent
            if (message.content.trim().toLowerCase() === '!consent') {
                await this.grantConsent(message.author.id);
                await message.reply("Thank you! You have consented to the data collection policy. You can now chat with me.");
                return;
            }
            
            await message.reply("Before we chat, please consent to our data collection policy (messages are stored for 30 days for safety). Type `!consent` to agree.");
            return;
        }

        // 2. Rate Limiting
        if (this.isRateLimited(message.author.id)) {
            await message.reply("You are sending messages too quickly. Please wait a moment.");
            return;
        }

        // 3. Generate Response
        try {
            // Show typing indicator
            if ('sendTyping' in message.channel) {
                await (message.channel as any).sendTyping();
            }

            // Prepare history
            const history = await this.fetchMessageHistory(message);

            // Clean prompt (remove mention)
            let prompt = message.content;
            if (this.client.user) {
                const mentionRegex = new RegExp(`<@!?${this.client.user.id}>`, 'g');
                prompt = prompt.replace(mentionRegex, '').trim();
            }

            if (!prompt) prompt = "Hello!"; // Handle empty messages (just mentions)

            const response = await generateResponse(
                prompt,
                history,
                this.character.systemInstruction
            );

            await message.reply(response);

            // Update last interaction for cleanup
            await this.updateLastInteraction(message.author.id);

        } catch (error) {
            console.error(`Error handling message for ${this.character.name}:`, error);
            await message.reply("I'm having a bit of trouble thinking right now. Try again later.");
        }
    }

    private async checkConsent(userId: string): Promise<boolean> {
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (!userDoc.exists) return false;
            const userData = userDoc.data() as IUser;
            return userData.hasConsented;
        } catch (error) {
            console.error("Error checking consent:", error);
            return false;
        }
    }

    private async grantConsent(userId: string) {
        try {
            const userData: IUser = {
                discordId: userId,
                hasConsented: true,
                consentDate: new Date(),
                lastInteraction: new Date()
            };
            await db.collection('users').doc(userId).set(userData);
        } catch (error) {
            console.error("Error granting consent:", error);
        }
    }

    private async updateLastInteraction(userId: string) {
        try {
            await db.collection('users').doc(userId).update({
                lastInteraction: new Date()
            });
        } catch (error) {
            // If update fails (e.g. doc deleted), try setting it again or ignore
            console.error("Error updating last interaction:", error);
        }
    }

    private isRateLimited(userId: string): boolean {
        const now = Date.now();
        const lastTime = this.lastMessageTime.get(userId) || 0;
        const cooldown = 2000; // 2 seconds
        if (now - lastTime < cooldown) {
            return true;
        }
        this.lastMessageTime.set(userId, now);
        return false;
    }

    private async fetchMessageHistory(message: Message): Promise<{ role: 'user' | 'model'; parts: string }[]> {
        try {
            // Fetch last 10 messages
            const messages = await message.channel.messages.fetch({ limit: 10, before: message.id });
            const history: { role: 'user' | 'model'; parts: string }[] = [];

            // Convert Collection to Array and reverse to get chronological order
            Array.from(messages.values()).reverse().forEach(msg => {
                if (msg.content && !msg.author.bot) {
                     // User message
                     if (msg.author.id === message.author.id) {
                        history.push({ role: 'user', parts: msg.content });
                     }
                } else if (msg.content && msg.author.id === this.client.user?.id) {
                    // Bot message
                    history.push({ role: 'model', parts: msg.content });
                }
            });

            return history;
        } catch (error) {
            console.error("Error fetching history:", error);
            return [];
        }
    }
}
