"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotInstance = void 0;
const discord_js_1 = require("discord.js");
const gemini_1 = require("../ai/gemini");
const firebase_1 = require("../database/firebase");
class BotInstance {
    client;
    character;
    isRunning = false;
    // Simple in-memory rate limiting: userId -> timestamp
    lastMessageTime = new Map();
    constructor(character) {
        this.character = character;
        this.client = new discord_js_1.Client({
            intents: [
                discord_js_1.GatewayIntentBits.Guilds,
                discord_js_1.GatewayIntentBits.GuildMessages,
                discord_js_1.GatewayIntentBits.MessageContent,
                discord_js_1.GatewayIntentBits.DirectMessages
            ],
            partials: [discord_js_1.Partials.Channel] // Required for DMs
        });
        this.setupEvents();
    }
    setupEvents() {
        this.client.once('ready', () => {
            console.log(`Bot ${this.character.name} is ready! Logged in as ${this.client.user?.tag}`);
        });
        this.client.on('messageCreate', this.handleMessage.bind(this));
    }
    async start() {
        if (this.isRunning)
            return;
        try {
            await this.client.login(this.character.botToken);
            this.isRunning = true;
            // Update avatar if needed
            await this.updateAvatar();
        }
        catch (error) {
            console.error(`Failed to start bot ${this.character.name}:`, error);
        }
    }
    async stop() {
        if (!this.isRunning)
            return;
        try {
            await this.client.destroy();
            this.isRunning = false;
            console.log(`Bot ${this.character.name} stopped.`);
        }
        catch (error) {
            console.error(`Error stopping bot ${this.character.name}:`, error);
        }
    }
    get currentToken() {
        return this.character.botToken;
    }
    updateCharacter(character) {
        const oldAvatar = this.character.avatarUrl;
        this.character = character;
        console.log(`Updated character data for ${this.character.name}`);
        // Check if avatar changed
        if (character.avatarUrl !== oldAvatar) {
            this.updateAvatar();
        }
    }
    async updateAvatar() {
        if (!this.character.avatarUrl || !this.client.user)
            return;
        try {
            console.log(`Updating avatar for ${this.character.name}...`);
            await this.client.user.setAvatar(this.character.avatarUrl);
            console.log(`Avatar updated for ${this.character.name}`);
        }
        catch (error) {
            console.error(`Failed to update avatar for ${this.character.name}:`, error);
            // Discord has strict rate limits for avatar changes (e.g. 2 times per hour)
            // We log the error but don't crash the bot
        }
    }
    async handleMessage(message) {
        if (message.author.bot)
            return;
        // Check if mentioned or DM
        const isDM = message.channel.type === discord_js_1.ChannelType.DM;
        const isMentioned = this.client.user ? message.mentions.users.has(this.client.user.id) : false;
        if (!isDM && !isMentioned)
            return;
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
                await message.channel.sendTyping();
            }
            // Prepare history
            const history = await this.fetchMessageHistory(message);
            // Clean prompt (remove mention)
            let prompt = message.content;
            if (this.client.user) {
                const mentionRegex = new RegExp(`<@!?${this.client.user.id}>`, 'g');
                prompt = prompt.replace(mentionRegex, '').trim();
            }
            if (!prompt)
                prompt = "Hello!"; // Handle empty messages (just mentions)
            const response = await (0, gemini_1.generateResponse)(prompt, history, this.character.systemInstruction);
            await message.reply(response);
            // Update last interaction for cleanup
            await this.updateLastInteraction(message.author.id);
        }
        catch (error) {
            console.error(`Error handling message for ${this.character.name}:`, error);
            await message.reply("I'm having a bit of trouble thinking right now. Try again later.");
        }
    }
    async checkConsent(userId) {
        try {
            const userDoc = await firebase_1.db.collection('users').doc(userId).get();
            if (!userDoc.exists)
                return false;
            const userData = userDoc.data();
            return userData.hasConsented;
        }
        catch (error) {
            console.error("Error checking consent:", error);
            return false;
        }
    }
    async grantConsent(userId) {
        try {
            const userData = {
                discordId: userId,
                hasConsented: true,
                consentDate: new Date(),
                lastInteraction: new Date()
            };
            await firebase_1.db.collection('users').doc(userId).set(userData);
        }
        catch (error) {
            console.error("Error granting consent:", error);
        }
    }
    async updateLastInteraction(userId) {
        try {
            await firebase_1.db.collection('users').doc(userId).update({
                lastInteraction: new Date()
            });
        }
        catch (error) {
            // If update fails (e.g. doc deleted), try setting it again or ignore
            console.error("Error updating last interaction:", error);
        }
    }
    isRateLimited(userId) {
        const now = Date.now();
        const lastTime = this.lastMessageTime.get(userId) || 0;
        const cooldown = 2000; // 2 seconds
        if (now - lastTime < cooldown) {
            return true;
        }
        this.lastMessageTime.set(userId, now);
        return false;
    }
    async fetchMessageHistory(message) {
        try {
            // Fetch last 10 messages
            const messages = await message.channel.messages.fetch({ limit: 10, before: message.id });
            const history = [];
            // Convert Collection to Array and reverse to get chronological order
            Array.from(messages.values()).reverse().forEach(msg => {
                if (msg.content && !msg.author.bot) {
                    // User message
                    if (msg.author.id === message.author.id) {
                        history.push({ role: 'user', parts: msg.content });
                    }
                }
                else if (msg.content && msg.author.id === this.client.user?.id) {
                    // Bot message
                    history.push({ role: 'model', parts: msg.content });
                }
            });
            return history;
        }
        catch (error) {
            console.error("Error fetching history:", error);
            return [];
        }
    }
}
exports.BotInstance = BotInstance;
//# sourceMappingURL=BotInstance.js.map