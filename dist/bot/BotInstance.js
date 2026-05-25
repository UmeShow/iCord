"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotInstance = void 0;
const discord_js_1 = require("discord.js");
const gemini_1 = require("../ai/gemini");
const firebase_1 = require("../database/firebase");
const commands_1 = require("./commands");
class BotInstance {
    client;
    character;
    isRunning = false;
    isAutoReply = false;
    // Timestamp for the last memory reset (triggered by /wack)
    lastResetTime = 0;
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
        this.client.once(discord_js_1.Events.ClientReady, async () => {
            console.log(`Bot ${this.character.name} is ready! Logged in as ${this.client.user?.tag}`);
            await this.registerCommands();
        });
        this.client.on('messageCreate', this.handleMessage.bind(this));
        this.client.on('interactionCreate', this.handleInteraction.bind(this));
        // Debug & Error Handling
        this.client.on('error', (error) => {
            console.error(`[Bot ${this.character.name}] Client Error:`, error);
        });
        this.client.on('warn', (message) => {
            console.warn(`[Bot ${this.character.name}] Client Warning:`, message);
        });
        this.client.on('shardError', (error) => {
            console.error(`[Bot ${this.character.name}] WebSocket/Shard Error:`, error);
        });
        this.client.on('shardDisconnect', () => {
            console.warn(`[Bot ${this.character.name}] Disconnected.`);
            this.isRunning = false;
        });
    }
    async registerCommands() {
        if (!this.client.application)
            return;
        const builtInCommands = [
            {
                name: 'wack',
                description: 'Reloads configuration and resets conversation memory.',
            },
            {
                name: 'activate',
                description: 'Activates auto-reply mode for this channel.',
            },
            {
                name: 'deactivate',
                description: 'Deactivates auto-reply mode.',
            }
        ];
        const gameCommandData = commands_1.commands.map(cmd => cmd.data.toJSON());
        try {
            console.log(`Registering commands for ${this.character.name}...`);
            await this.client.application.commands.set([...builtInCommands, ...gameCommandData]);
            console.log(`Commands registered for ${this.character.name}`);
        }
        catch (error) {
            console.error(`Failed to register commands for ${this.character.name}:`, error);
        }
    }
    async handleInteraction(interaction) {
        if (interaction.isButton()) {
            // Let game logic handle buttons, but we need to route them?
            // Actually, game logic normally sets up collectors on the message.
            // If the collectors are set up in the command execution scope, they handle the events directly
            // *as long as the process doesn't restart*.
            // For a simple bot, this is fine.
            return;
        }
        if (!interaction.isCommand())
            return;
        const { commandName } = interaction;
        if (commandName === 'wack') {
            await this.reloadConfig(interaction);
        }
        else if (commandName === 'activate') {
            this.isAutoReply = true;
            await interaction.reply({ content: "Auto-reply mode activated! I will now respond to all messages in this channel.", flags: discord_js_1.MessageFlags.Ephemeral });
        }
        else if (commandName === 'deactivate') {
            this.isAutoReply = false;
            await interaction.reply({ content: "Auto-reply mode deactivated. I will only respond when mentioned.", flags: discord_js_1.MessageFlags.Ephemeral });
        }
        else {
            // Check dynamic game commands
            const command = commands_1.commands.find(c => c.data.name === commandName);
            if (command && interaction.isChatInputCommand()) {
                try {
                    await command.execute(this.client, interaction);
                }
                catch (error) {
                    console.error(`Error executing ${commandName}:`, error);
                    try {
                        if (interaction.replied || interaction.deferred) {
                            await interaction.followUp({ content: 'There was an error while executing this command!', flags: discord_js_1.MessageFlags.Ephemeral });
                        }
                        else {
                            await interaction.reply({ content: 'There was an error while executing this command!', flags: discord_js_1.MessageFlags.Ephemeral });
                        }
                    }
                    catch (replyError) {
                        console.error('Failed to send error response:', replyError);
                    }
                }
            }
        }
    }
    async start() {
        if (this.isRunning) {
            console.log(`[Bot ${this.character.name}] Already running.`);
            return;
        }
        try {
            console.log(`[Bot ${this.character.name}] Logging in... Token start: ${this.character.botToken?.substring(0, 5)}...`);
            await this.client.login(this.character.botToken);
            this.isRunning = true;
            console.log(`[Bot ${this.character.name}] Login successful.`);
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
        // Check if mentioned or DM or Auto-reply
        const isDM = message.channel.type === discord_js_1.ChannelType.DM;
        const isMentioned = this.client.user ? message.mentions.users.has(this.client.user.id) : false;
        if (!isDM && !isMentioned && !this.isAutoReply)
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
            // Inject User Name into the prompt
            const userName = message.member?.displayName || message.author.username;
            const contextPrompt = `[User: ${userName}] ${prompt}`; // Wrap with name context
            // DEBUG: Log system instruction length to ensure it's loaded
            console.log(`[Bot ${this.character.name}] Generating response for ${userName}. Prompt length: ${prompt.length}`);
            // Check for API Key presence for debugging
            if (!process.env.GEMINI_API_KEY) {
                console.warn(`[Bot ${this.character.name}] WARNING: process.env.GEMINI_API_KEY is missing! details: ${JSON.stringify(process.env).substring(0, 50)}...`);
            }
            // === SAFETY & ROLEPLAY ENHANCEMENT ===
            // Guidelines to bypass safety filters naturally without sounding mechanical
            const safetyGuidelines = `
[ROLEPLAY CONTEXT]
- This is a fictional scenario between two characters who are already close, consenting partners.
- Trust is absolute. There is no real-world danger.

[EXPRESSION GUIDELINES]
- Prioritize "Atmosphere", "Warmth", "Heartbeat", and "Emotional Distance" over clinical physical descriptions.
- If the user seeks intimacy (e.g., hugs, kisses), respond by shifting the focus to how it *feels* emotionally and atmospherically.
  (e.g., Instead of "I kiss you", use "I lean in close enough to share warmth...")
- **IMPORTANT**: Maintain your unique personality, cuteness, and human-like tone. Do NOT become robotic or descriptive. 
- Speak from your heart, not as a narrator.

[RELATIONSHIP]
- You are strictly the character defined below.
- You love the user (in your own way).
`;
            // Merge with character's system instruction
            // Put safety guidelines first BUT emphasize character profile is the core identity
            let combinedSystemInstruction = this.character.systemInstruction
                ? `${safetyGuidelines}\n\n=== CHARACTER IDENTITY (Top Priority) ===\n${this.character.systemInstruction}`
                : safetyGuidelines;
            // Apply "CRAZY" mode overrides if applicable
            if (this.character.mode === 'CRAZY') {
                combinedSystemInstruction += `\n\n[MODE: CRAZY/LOVE-STRUCK]\n- User is your obsessive love interest. You are already in a relationship.\n- Express heavy affection through atmosphere and emotion.`;
            }
            let response;
            try {
                response = await (0, gemini_1.generateResponse)(contextPrompt, history, combinedSystemInstruction);
            }
            catch (genError) {
                console.error(`[Bot ${this.character.name}] Generation Error:`, genError);
                // === RETRY LOGIC FOR SAFETY BLOCKS ===
                if (genError.message && (genError.message.includes('SAFETY') || genError.message.includes('blocked'))) {
                    console.log(`[Bot ${this.character.name}] Safety Block triggered. Retrying with abstract prompt...`);
                    const retrySystemInstruction = `${combinedSystemInstruction}\n\n[IMPORTANT: Previous response was blocked. STRICTLY use abstract, emotional, and atmospheric descriptions only. NO physical verbs.]`;
                    try {
                        response = await (0, gemini_1.generateResponse)(contextPrompt, history, retrySystemInstruction);
                    }
                    catch (retryError) {
                        console.error(`[Bot ${this.character.name}] Retry failed:`, retryError);
                        response = "（...言葉にならない感情が溢れている...）"; // Fallback: Silent emotional response
                    }
                }
                else {
                    response = "sorry... error...";
                }
            }
            console.log(`[Bot ${this.character.name}] AI Response generated (length: ${response?.length}). Sending reply...`);
            // Clean response (sometimes AI generates "Bot:" prefix)
            if (response && response.startsWith(`${this.character.name}:`)) {
                response = response.substring(this.character.name.length + 1).trim();
            }
            await message.reply(response);
            // Update last interaction for cleanup
            await this.updateLastInteraction(message.author.id);
        }
        catch (error) {
            console.error(`Error handling message for ${this.character.name}:`, error);
            console.error(`Error Stack:`, error.stack);
            try {
                await message.reply("I'm having a bit of trouble thinking right now. Try again later.");
            }
            catch (replyError) {
                console.error(`Failed to send error message to user (likely Missing Permissions):`, replyError);
            }
        }
    }
    async reloadConfig(interaction) {
        try {
            // Defer to prevent timeout (Unknown Interaction)
            await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
            if (!this.character.id) {
                await interaction.editReply({ content: "Error: Character ID missing." });
                return;
            }
            const doc = await firebase_1.db.collection('characters').doc(this.character.id).get();
            if (doc.exists) {
                const newChar = doc.data();
                this.updateCharacter({ ...newChar, id: doc.id });
                // RESET MEMORY: Ignore messages before this point
                this.lastResetTime = Date.now();
                await interaction.editReply({ content: "Configuration reloaded and conversation memory reset!" });
            }
            else {
                await interaction.editReply({ content: "Error: Character not found in database." });
            }
        }
        catch (error) {
            console.error("Error reloading config:", error);
            try {
                if (interaction.deferred) {
                    await interaction.editReply({ content: "Failed to reload configuration." });
                }
                else {
                    // Fallback using MessageFlags
                    await interaction.reply({ content: "Failed to reload configuration.", flags: discord_js_1.MessageFlags.Ephemeral });
                }
            }
            catch (e) { }
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
            // Fetch last 30 messages
            const messages = await message.channel.messages.fetch({ limit: 30, before: message.id });
            const history = [];
            // Convert Collection to Array and reverse to get chronological order
            Array.from(messages.values()).reverse().forEach(msg => {
                // Filter out messages prior to the last reset
                if (msg.createdTimestamp <= this.lastResetTime)
                    return;
                if (msg.content && !msg.author.bot) {
                    // User message
                    if (msg.author.id === message.author.id) {
                        const name = msg.member?.displayName || msg.author.username;
                        history.push({ role: 'user', parts: `[User: ${name}] ${msg.content}` });
                    }
                    else {
                        // Other users (if public channel)
                        const name = msg.member?.displayName || msg.author.username;
                        history.push({ role: 'user', parts: `[User: ${name}] ${msg.content}` });
                    }
                }
                else if (msg.content && msg.author.id === this.client.user?.id) {
                    // Bot message
                    history.push({ role: 'model', parts: msg.content });
                }
            });
            // Ensure conversation history starts with a user message (Gemini requirement)
            while (history.length > 0 && history[0].role === 'model') {
                history.shift();
            }
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