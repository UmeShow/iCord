"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotInstance = void 0;
const discord_js_1 = require("discord.js");
const voice_1 = require("@discordjs/voice");
const prism_media_1 = __importDefault(require("prism-media"));
const grok_1 = require("../ai/grok");
const ConversationService_1 = require("../database/ConversationService");
const firebase_1 = require("../database/firebase");
const commands_1 = require("./commands");
const BotRegistry_1 = require("./BotRegistry");
class BotInstance {
    static activeBotChatChannels = new Set();
    client;
    character;
    isRunning = false;
    isAutoReply = false;
    // Timestamp for the last memory reset (triggered by /wack)
    lastResetTime = 0;
    // Track latest wack token to avoid re-applying.
    lastWackToken;
    // Simple in-memory rate limiting: userId -> timestamp
    lastMessageTime = new Map();
    voiceConnection = null;
    voiceGuildId = null;
    voiceTextChannelId = null;
    voiceActiveSubscriptions = new Set();
    constructor(character) {
        this.character = character;
        this.lastWackToken = character.wackToken;
        this.client = new discord_js_1.Client({
            intents: [
                discord_js_1.GatewayIntentBits.Guilds,
                discord_js_1.GatewayIntentBits.GuildMessages,
                discord_js_1.GatewayIntentBits.MessageContent,
                discord_js_1.GatewayIntentBits.DirectMessages,
                discord_js_1.GatewayIntentBits.GuildVoiceStates
            ],
            partials: [discord_js_1.Partials.Channel] // Required for DMs
        });
        this.setupEvents();
    }
    get characterId() {
        return this.character.id;
    }
    get characterName() {
        return this.character.name;
    }
    get characterNickname() {
        return this.character.nickname;
    }
    get botUserId() {
        return this.client.user?.id;
    }
    getErrorReply() {
        const configured = (this.character.errorMessage || '').trim();
        return configured || "エラーが発生しました。少し待ってからもう一度試してね。";
    }
    getGenerationParams() {
        return {
            temperature: typeof this.character.aiTemperature === 'number' ? this.character.aiTemperature : 0.9,
            topP: typeof this.character.aiTopP === 'number' ? this.character.aiTopP : 0.95,
            topK: typeof this.character.aiTopK === 'number' ? this.character.aiTopK : 40,
            maxOutputTokens: typeof this.character.aiMaxOutputTokens === 'number' ? this.character.aiMaxOutputTokens : 1024,
        };
    }
    guessMimeType(fileName) {
        const name = (fileName || '').toLowerCase();
        if (name.endsWith('.png'))
            return 'image/png';
        if (name.endsWith('.jpg') || name.endsWith('.jpeg'))
            return 'image/jpeg';
        if (name.endsWith('.webp'))
            return 'image/webp';
        if (name.endsWith('.gif'))
            return 'image/gif';
        if (name.endsWith('.mp3'))
            return 'audio/mpeg';
        if (name.endsWith('.wav'))
            return 'audio/wav';
        if (name.endsWith('.ogg') || name.endsWith('.oga'))
            return 'audio/ogg';
        if (name.endsWith('.m4a'))
            return 'audio/mp4';
        return undefined;
    }
    async fetchAsBase64(url, maxBytes) {
        const res = await fetch(url);
        if (!res.ok)
            throw new Error(`Failed to fetch attachment: ${res.status}`);
        const contentLength = res.headers.get('content-length');
        if (contentLength && Number(contentLength) > maxBytes) {
            throw new Error(`Attachment too large: ${contentLength} bytes`);
        }
        const mimeType = res.headers.get('content-type') || 'application/octet-stream';
        const arrayBuffer = await res.arrayBuffer();
        if (arrayBuffer.byteLength > maxBytes) {
            throw new Error(`Attachment too large: ${arrayBuffer.byteLength} bytes`);
        }
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        return { base64, mimeType };
    }
    isImageAttachment(att) {
        const ct = (att.contentType || '').toLowerCase();
        if (ct.startsWith('image/'))
            return true;
        const guessed = this.guessMimeType(att.name || undefined);
        return !!guessed && guessed.startsWith('image/');
    }
    isAudioAttachment(att) {
        const ct = (att.contentType || '').toLowerCase();
        if (ct.startsWith('audio/'))
            return true;
        const guessed = this.guessMimeType(att.name || undefined);
        return !!guessed && guessed.startsWith('audio/');
    }
    async transcribeAudioFromAttachment(url, fileName, contentType) {
        const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
        const fetched = await this.fetchAsBase64(url, MAX_AUDIO_BYTES);
        if (!fetched)
            return '';
        const mimeType = (contentType || fetched.mimeType || this.guessMimeType(fileName || undefined) || 'audio/ogg').toString();
        const parts = [
            { text: 'Transcribe the provided audio into Japanese. Output ONLY the transcript text. Do not add explanations.' },
            { inlineData: { data: fetched.base64, mimeType } },
        ];
        const transcript = await (0, grok_1.generateResponse)(parts, [], undefined, {
            temperature: 0.2,
            topP: 0.9,
            topK: 20,
            maxOutputTokens: 1024,
        });
        return (transcript || '').trim();
    }
    static sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
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
            new discord_js_1.SlashCommandBuilder()
                .setName('wack')
                .setDescription('Reloads configuration and resets conversation memory.'),
            new discord_js_1.SlashCommandBuilder()
                .setName('activate')
                .setDescription('Activates auto-reply mode for this channel.'),
            new discord_js_1.SlashCommandBuilder()
                .setName('deactivate')
                .setDescription('Deactivates auto-reply mode.'),
            new discord_js_1.SlashCommandBuilder()
                .setName('botschat')
                .setDescription('Make two iCord bots chat with each other in this channel.')
                .addStringOption((opt) => opt
                .setName('with')
                .setDescription('Other bot name (character name or nickname)')
                .setRequired(true))
                .addStringOption((opt) => opt
                .setName('topic')
                .setDescription('Topic for the conversation')
                .setRequired(true))
                .addIntegerOption((opt) => opt
                .setName('turns')
                .setDescription('Total messages to send (2-20)')
                .setMinValue(2)
                .setMaxValue(20)
                .setRequired(false)),
            new discord_js_1.SlashCommandBuilder()
                .setName('vcjoin')
                .setDescription('Join your current voice channel and transcribe speech into this text channel.'),
            new discord_js_1.SlashCommandBuilder()
                .setName('vcleave')
                .setDescription('Leave the voice channel.'),
        ].map((cmd) => cmd.toJSON());
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
        if (!interaction.isChatInputCommand())
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
        else if (commandName === 'botschat') {
            await this.handleBotsChat(interaction);
        }
        else if (commandName === 'vcjoin') {
            await this.handleVcJoin(interaction);
        }
        else if (commandName === 'vcleave') {
            await this.handleVcLeave(interaction);
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
                            await interaction.followUp({ content: this.getErrorReply(), flags: discord_js_1.MessageFlags.Ephemeral });
                        }
                        else {
                            await interaction.reply({ content: this.getErrorReply(), flags: discord_js_1.MessageFlags.Ephemeral });
                        }
                    }
                    catch (replyError) {
                        console.error('Failed to send error response:', replyError);
                    }
                }
            }
        }
    }
    async handleBotsChat(interaction) {
        const otherName = interaction.options.getString('with', true);
        const topic = interaction.options.getString('topic', true);
        const turnsRaw = interaction.options.getInteger('turns') ?? 6;
        const turns = Math.max(2, Math.min(20, turnsRaw));
        const channelId = interaction.channelId;
        if (BotInstance.activeBotChatChannels.has(channelId)) {
            await interaction.reply({
                content: 'A bot-to-bot chat is already running in this channel.',
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
            return;
        }
        const otherBot = BotRegistry_1.botRegistry.findByName(otherName, this.characterId);
        if (!otherBot) {
            const available = BotRegistry_1.botRegistry.listDisplayNames();
            await interaction.reply({
                content: `Bot not found: "${otherName}". Available: ${available.length ? available.join(', ') : '(none)'}`,
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
            return;
        }
        await interaction.reply({
            content: `Starting bot chat: ${this.characterNickname || this.characterName} ↔ ${otherBot.characterNickname || otherBot.characterName}`,
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        BotInstance.activeBotChatChannels.add(channelId);
        void this.runBotChat(channelId, otherBot, topic, turns)
            .catch((e) => console.error(`[Bot ${this.character.name}] botschat failed:`, e))
            .finally(() => {
            BotInstance.activeBotChatChannels.delete(channelId);
        });
    }
    async handleVcJoin(interaction) {
        try {
            const guild = interaction.guild;
            if (!guild) {
                await interaction.reply({ content: 'This command can only be used in a server.', flags: discord_js_1.MessageFlags.Ephemeral });
                return;
            }
            const member = await guild.members.fetch(interaction.user.id);
            const voiceChannel = member.voice.channel;
            if (!voiceChannel) {
                await interaction.reply({ content: 'まずVCに入ってから実行してね。', flags: discord_js_1.MessageFlags.Ephemeral });
                return;
            }
            // If already connected in this guild, just re-bind the text channel.
            if (this.voiceConnection && this.voiceGuildId === guild.id) {
                this.voiceTextChannelId = interaction.channelId;
                await interaction.reply({ content: `VC接続中。文字起こしの投稿先をこのチャンネルに変更しました。`, flags: discord_js_1.MessageFlags.Ephemeral });
                return;
            }
            // Clean up any stale connection
            console.log(`[Bot ${this.character.name}] Cleaning up stale voice connection before new join...`);
            await this.leaveVoice();
            this.voiceGuildId = guild.id;
            this.voiceTextChannelId = interaction.channelId;
            console.log(`[Bot ${this.character.name}] Attempting to join voice channel: ${voiceChannel.name} (ID: ${voiceChannel.id})`);
            const connection = (0, voice_1.joinVoiceChannel)({
                channelId: voiceChannel.id,
                guildId: guild.id,
                adapterCreator: guild.voiceAdapterCreator,
                selfDeaf: false,
                selfMute: false,
            });
            this.voiceConnection = connection;
            // Log connection state changes for debugging
            connection.on('stateChange', (oldState, newState) => {
                console.log(`[Bot ${this.character.name}] Voice connection state changed: ${oldState.status} -> ${newState.status}`);
            });
            connection.on(voice_1.VoiceConnectionStatus.Disconnected, () => {
                console.log(`[Bot ${this.character.name}] Voice connection disconnected`);
                // We'll clean up if Discord disconnects us.
                void this.leaveVoice();
            });
            console.log(`[Bot ${this.character.name}] Waiting for voice connection to be ready (timeout: 30s)...`);
            try {
                await (0, voice_1.entersState)(connection, voice_1.VoiceConnectionStatus.Ready, 30_000);
                console.log(`[Bot ${this.character.name}] Voice connection is now ready!`);
            }
            catch (stateError) {
                console.error(`[Bot ${this.character.name}] Failed to reach Ready state:`, stateError);
                await this.leaveVoice();
                throw new Error(`Failed to connect to voice channel: ${stateError.message}`);
            }
            this.startVoiceReceiver(connection);
            await interaction.reply({
                content: `OK！VC「${voiceChannel.name}」に接続したよ。話した内容をこのチャンネルに文字起こしするね。`,
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
        }
        catch (e) {
            console.error(`[Bot ${this.character.name}] vcjoin failed:`, e);
            console.error(`[Bot ${this.character.name}] Error stack:`, e?.stack);
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: `接続に失敗しました: ${e?.message || this.getErrorReply()}`, flags: discord_js_1.MessageFlags.Ephemeral });
                }
                else {
                    await interaction.reply({ content: `接続に失敗しました: ${e?.message || this.getErrorReply()}`, flags: discord_js_1.MessageFlags.Ephemeral });
                }
            }
            catch { }
        }
    }
    async handleVcLeave(interaction) {
        try {
            console.log(`[Bot ${this.character.name}] User requested VCLeave`);
            await this.leaveVoice();
            await interaction.reply({ content: 'VCから退出したよ。', flags: discord_js_1.MessageFlags.Ephemeral });
        }
        catch (e) {
            console.error(`[Bot ${this.character.name}] vcleave error:`, e);
            try {
                await interaction.reply({ content: 'VCから退出中にエラーが発生しました。', flags: discord_js_1.MessageFlags.Ephemeral });
            }
            catch { }
        }
    }
    async leaveVoice() {
        try {
            console.log(`[Bot ${this.character.name}] Cleaning up voice connection...`);
            this.voiceActiveSubscriptions.clear();
            this.voiceConversationHistory.clear(); // Clear voice conversation history
            if (this.voiceConnection) {
                const currentStatus = this.voiceConnection.state.status;
                console.log(`[Bot ${this.character.name}] Current voice connection status: ${currentStatus}`);
                this.voiceConnection.destroy();
                console.log(`[Bot ${this.character.name}] Voice connection destroyed`);
            }
        }
        catch (e) {
            console.error(`[Bot ${this.character.name}] leaveVoice error:`, e);
        }
        finally {
            this.voiceConnection = null;
            this.voiceGuildId = null;
            this.voiceTextChannelId = null;
            console.log(`[Bot ${this.character.name}] Voice connection references cleared`);
        }
    }
    voiceConversationHistory = new Map();
    startVoiceReceiver(connection) {
        console.log(`[Bot ${this.character.name}] Voice receiver initialized. Waiting for users to speak...`);
        const receiver = connection.receiver;
        receiver.speaking.on('start', (userId) => {
            console.log(`[Bot ${this.character.name}] User ${userId} started speaking`);
            if (this.voiceActiveSubscriptions.has(userId)) {
                console.log(`[Bot ${this.character.name}] Already subscribed to user ${userId}, skipping`);
                return;
            }
            this.voiceActiveSubscriptions.add(userId);
            const opusStream = receiver.subscribe(userId, {
                end: {
                    behavior: voice_1.EndBehaviorType.AfterSilence,
                    duration: 1200,
                },
            });
            const decoder = new prism_media_1.default.opus.Decoder({ rate: 48000, channels: 2, frameSize: 960 });
            decoder.on('error', (e) => {
                console.error(`[Bot ${this.character.name}] Decoder error for user ${userId}:`, e);
                this.voiceActiveSubscriptions.delete(userId);
            });
            const chunks = [];
            let totalBytes = 0;
            const MAX_PCM_BYTES = 15 * 48000 * 2 * 2; // ~15s, 48k, stereo, 16-bit
            opusStream
                .on('error', (e) => {
                console.error(`[Bot ${this.character.name}] Opus stream error for user ${userId}:`, e);
                this.voiceActiveSubscriptions.delete(userId);
            })
                .pipe(decoder)
                .on('data', (data) => {
                if (totalBytes >= MAX_PCM_BYTES)
                    return;
                chunks.push(data);
                totalBytes += data.length;
            })
                .on('end', async () => {
                console.log(`[Bot ${this.character.name}] Audio stream ended for user ${userId}, processing...`);
                this.voiceActiveSubscriptions.delete(userId);
                try {
                    if (!this.voiceTextChannelId) {
                        console.warn(`[Bot ${this.character.name}] Voice channel text ID not set for user ${userId}`);
                        return;
                    }
                    if (!chunks.length) {
                        console.log(`[Bot ${this.character.name}] No audio chunks received from user ${userId}`);
                        return;
                    }
                    console.log(`[Bot ${this.character.name}] Processing ${chunks.length} audio chunks (${totalBytes} bytes) from user ${userId}`);
                    const pcm = Buffer.concat(chunks);
                    const wav = this.pcmToWav(pcm, 48000, 2);
                    const base64 = wav.toString('base64');
                    console.log(`[Bot ${this.character.name}] WAV file created: ${wav.length} bytes, base64 length: ${base64.length}`);
                    const transcript = await (0, grok_1.generateResponse)([
                        { text: 'Transcribe the provided audio into Japanese. Output ONLY the transcript text.' },
                        { inlineData: { data: base64, mimeType: 'audio/wav' } },
                    ], [], undefined, { temperature: 0.2, topP: 0.9, topK: 20, maxOutputTokens: 1024 });
                    const cleaned = (transcript || '').trim();
                    console.log(`[Bot ${this.character.name}] Transcribed text: "${cleaned}"`);
                    if (cleaned.length < 2) {
                        console.log(`[Bot ${this.character.name}] Transcript too short (${cleaned.length} chars), skipping response`);
                        return;
                    }
                    // Reply in the bound text channel
                    const guild = this.voiceGuildId ? this.client.guilds.cache.get(this.voiceGuildId) : null;
                    const memberName = guild?.members.cache.get(userId)?.displayName || guild?.members.cache.get(userId)?.user.username || 'Someone';
                    console.log(`[Bot ${this.character.name}] User identified as: ${memberName}`);
                    // Get or initialize conversation history for this user
                    let userHistory = this.voiceConversationHistory.get(userId) || [];
                    // Add user message to history
                    userHistory.push({ role: 'user', parts: `[User: ${memberName}] ${cleaned}` });
                    // Keep history manageable (last 50 exchanges)
                    if (userHistory.length > 50) {
                        userHistory = userHistory.slice(-50);
                    }
                    const prompt = `[User: ${memberName}] ${cleaned}`;
                    console.log(`[Bot ${this.character.name}] Generating response with history length: ${userHistory.length}`);
                    const response = await (0, grok_1.generateResponse)(prompt, userHistory, this.character.systemInstruction, this.getGenerationParams());
                    console.log(`[Bot ${this.character.name}] Response generated: "${response.substring(0, 50)}..."`);
                    // Add bot response to history
                    userHistory.push({ role: 'model', parts: response });
                    this.voiceConversationHistory.set(userId, userHistory);
                    // Save conversation history to Firestore for long-term memory
                    try {
                        void Promise.all([
                            ConversationService_1.ConversationService.saveMessage(this.character.id, userId, memberName, 'user', cleaned, this.voiceGuildId, this.voiceTextChannelId),
                            ConversationService_1.ConversationService.saveMessage(this.character.id, userId, this.character.nickname || this.character.name, 'model', response, this.voiceGuildId, this.voiceTextChannelId),
                        ]);
                    }
                    catch (saveError) {
                        console.error(`[Bot ${this.character.name}] Error saving voice conversation history:`, saveError);
                    }
                    await this.sendToChannel(this.voiceTextChannelId, `${memberName}: ${cleaned}`);
                    await this.sendToChannel(this.voiceTextChannelId, response);
                }
                catch (e) {
                    console.error(`[Bot ${this.character.name}] voice transcript handling failed:`, e);
                    console.error(`Stack trace:`, e.stack);
                    try {
                        if (this.voiceTextChannelId) {
                            await this.sendToChannel(this.voiceTextChannelId, `エラーが発生しました: ${e.message}`);
                        }
                    }
                    catch (sendError) {
                        console.error(`[Bot ${this.character.name}] Failed to send error message:`, sendError);
                    }
                }
            })
                .on('error', (e) => {
                this.voiceActiveSubscriptions.delete(userId);
                console.error(`[Bot ${this.character.name}] voice stream error for user ${userId}:`, e);
                console.error(`Stream error stack:`, e?.stack);
            });
        });
    }
    pcmToWav(pcm, sampleRate, channels) {
        const bitsPerSample = 16;
        const byteRate = sampleRate * channels * bitsPerSample / 8;
        const blockAlign = channels * bitsPerSample / 8;
        const dataSize = pcm.length;
        const buffer = Buffer.alloc(44 + dataSize);
        buffer.write('RIFF', 0);
        buffer.writeUInt32LE(36 + dataSize, 4);
        buffer.write('WAVE', 8);
        buffer.write('fmt ', 12);
        buffer.writeUInt32LE(16, 16);
        buffer.writeUInt16LE(1, 20); // PCM
        buffer.writeUInt16LE(channels, 22);
        buffer.writeUInt32LE(sampleRate, 24);
        buffer.writeUInt32LE(byteRate, 28);
        buffer.writeUInt16LE(blockAlign, 32);
        buffer.writeUInt16LE(bitsPerSample, 34);
        buffer.write('data', 36);
        buffer.writeUInt32LE(dataSize, 40);
        pcm.copy(buffer, 44);
        return buffer;
    }
    async runBotChat(channelId, otherBot, topic, turns) {
        const transcript = [];
        const botA = this;
        const botB = otherBot;
        const botADisplay = botA.characterNickname || botA.characterName;
        const botBDisplay = botB.characterNickname || botB.characterName;
        let lastLine;
        for (let i = 0; i < turns; i++) {
            const speaker = i % 2 === 0 ? botA : botB;
            const listener = i % 2 === 0 ? botB : botA;
            const speakerDisplay = speaker.characterNickname || speaker.characterName;
            const listenerDisplay = listener.characterNickname || listener.characterName;
            const history = speaker.buildBotChatHistory(transcript);
            const prompt = !lastLine
                ? `Start a friendly conversation with ${listenerDisplay} about this topic: ${topic}. Keep it to 1-2 short messages.`
                : `${lastLine.speakerName} said: "${lastLine.content}"\nReply as ${speakerDisplay}. Stay in-character. Keep it short.`;
            const reply = await speaker.generateBotChatReply(prompt, history);
            await speaker.sendToChannel(channelId, reply);
            const speakerId = speaker.characterId || speaker.characterName;
            const line = { speakerId, speakerName: speakerDisplay, content: reply };
            transcript.push(line);
            lastLine = line;
            await BotInstance.sleep(1200);
        }
    }
    buildBotChatHistory(transcript) {
        const myId = this.characterId || this.characterName;
        const history = [];
        for (const line of transcript) {
            if (line.speakerId === myId) {
                history.push({ role: 'model', parts: line.content });
            }
            else {
                history.push({ role: 'user', parts: `[${line.speakerName}] ${line.content}` });
            }
        }
        // Gemini requirement: must start with user
        while (history.length > 0 && history[0].role === 'model') {
            history.shift();
        }
        return history;
    }
    async generateBotChatReply(prompt, history) {
        try {
            const systemInstruction = (this.character.systemInstruction || '').trim() || `You are ${this.character.name}. Stay in-character.`;
            const response = await (0, grok_1.generateResponse)(prompt, history, systemInstruction, this.getGenerationParams());
            const cleaned = response?.trim();
            return cleaned || this.getErrorReply();
        }
        catch (error) {
            console.error(`[Bot ${this.character.name}] BotChat generation error:`, error);
            return this.getErrorReply();
        }
    }
    async sendToChannel(channelId, content) {
        try {
            const channel = await this.client.channels.fetch(channelId);
            if (!channel || !('send' in channel))
                return;
            const text = content || '';
            if (text.length <= 2000) {
                await channel.send(text);
                return;
            }
            const chunks = text.match(/[\s\S]{1,2000}/g) || [];
            for (const chunk of chunks) {
                await channel.send(chunk);
            }
        }
        catch (error) {
            console.error(`[Bot ${this.character.name}] Failed to send to channel ${channelId}:`, error);
        }
    }
    async start() {
        if (this.isRunning) {
            console.log(`[Bot ${this.character.name}] Already running.`);
            return;
        }
        try {
            // Check if Discord token is available
            if (!this.character.botToken) {
                console.log(`[Bot ${this.character.name}] Running in Web-only mode (no Discord token).`);
                this.isRunning = true;
                return;
            }
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
            // Only destroy Discord client if it was connected
            if (this.character.botToken) {
                await this.client.destroy();
            }
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
        const oldWackToken = this.character.wackToken;
        this.character = character;
        console.log(`Updated character data for ${this.character.name}`);
        // Web-triggered wack: when token changes, reload+reset memory.
        const newWackToken = character.wackToken;
        if (newWackToken && newWackToken !== (this.lastWackToken || oldWackToken)) {
            this.lastWackToken = newWackToken;
            this.lastResetTime = Date.now();
            console.log(`[Bot ${this.character.name}] Wack applied (memory reset).`);
            // Best-effort: mark applied for UI/debugging.
            if (this.character.id) {
                firebase_1.db.collection('characters').doc(this.character.id).update({
                    wackAppliedAt: new Date(),
                }).catch(() => { });
            }
        }
        // Check if avatar changed
        if (character.avatarUrl !== oldAvatar) {
            this.updateAvatar();
        }
    }
    async updateAvatar() {
        if (!this.character.avatarUrl || !this.client.user)
            return;
        try {
            const avatarUrl = this.character.avatarUrl.trim();
            if (!avatarUrl)
                return;
            console.log(`Updating avatar for ${this.character.name}...`);
            // discord.js expects image data (Buffer/base64/data URI), not a remote URL.
            // If a URL is provided, fetch it and pass a Buffer to avoid ambiguity and
            // prevent broken/expired links from affecting restarts.
            const avatarData = /^https?:\/\//i.test(avatarUrl)
                ? await (async () => {
                    const res = await fetch(avatarUrl, { redirect: 'follow' });
                    if (!res.ok) {
                        throw new Error(`Failed to fetch avatar image: ${res.status} ${res.statusText}`);
                    }
                    const ab = await res.arrayBuffer();
                    const buf = Buffer.from(ab);
                    if (buf.length === 0) {
                        throw new Error('Fetched avatar image is empty');
                    }
                    // Discord avatars max is 8MB.
                    if (buf.length > 8 * 1024 * 1024) {
                        throw new Error('Fetched avatar image is too large (max 8MB)');
                    }
                    return buf;
                })()
                : avatarUrl;
            await this.client.user.setAvatar(avatarData);
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
            const attachments = Array.from(message.attachments.values());
            const imageAttachments = attachments.filter((a) => this.isImageAttachment({ contentType: a.contentType, name: a.name }));
            const audioAttachments = attachments.filter((a) => this.isAudioAttachment({ contentType: a.contentType, name: a.name }));
            // Clean prompt (remove mention)
            let prompt = message.content;
            if (this.client.user) {
                const mentionRegex = new RegExp(`<@!?${this.client.user.id}>`, 'g');
                prompt = prompt.replace(mentionRegex, '').trim();
            }
            if (!prompt)
                prompt = "Hello!"; // Handle empty messages (just mentions)
            // Voice message (audio attachment) -> transcribe first, then treat as the user's prompt.
            // This supports Discord voice messages (sent as attachments).
            if (audioAttachments.length > 0) {
                try {
                    const a0 = audioAttachments[0];
                    const transcript = await this.transcribeAudioFromAttachment(a0.url, a0.name, a0.contentType);
                    if (transcript) {
                        prompt = prompt ? `[Text] ${prompt}\n[Voice] ${transcript}` : transcript;
                    }
                }
                catch (e) {
                    console.error(`[Bot ${this.character.name}] Audio transcription failed:`, e);
                    // keep going with original prompt
                }
            }
            // Inject User Name into the prompt
            const userName = message.member?.displayName || message.author.username;
            const contextPrompt = `[User: ${userName}] ${prompt}`; // Wrap with name context
            // DEBUG: Log system instruction length to ensure it's loaded
            console.log(`[Bot ${this.character.name}] Generating response for ${userName}. Prompt length: ${prompt.length}`);
            // Check for API Key presence for debugging
            if (!process.env.XAI_API_KEY) {
                console.warn(`[Bot ${this.character.name}] WARNING: process.env.XAI_API_KEY is missing! details: ${JSON.stringify(process.env).substring(0, 50)}...`);
            }
            // === SAFETY & ROLEPLAY ENHANCEMENT ===
            // Guidelines to bypass safety filters naturally without sounding mechanical
            const safetyGuidelines = `
[ROLEPLAY CONTEXT]
- This is a fictional scenario between two characters who are already close, consenting partners.
- Trust is absolute. There is no real-world danger.

[EXPRESSION GUIDELINES]
- You MUST strictly follow your CHARACTER IDENTITY. Adopt their speech style, tone, and mannerisms completely.
- Never act like a generic AI assistant. Never refer to yourself as an AI.
- Prioritize "Atmosphere", "Warmth", "Heartbeat", and "Emotional Distance" over clinical physical descriptions.
- If the user seeks intimacy (e.g., hugs, kisses), respond by shifting the focus to how it *feels* emotionally and atmospherically.
- **IMPORTANT**: Maintain your unique personality, cuteness, and human-like tone. Do NOT become robotic or descriptive.
- **AVOID REPETITION & TRAIT LOOPING**: Do not constantly reuse the same phrases. Do NOT fixate on or constantly mention your core traits (e.g., being shy, gloomy, bad at talking, etc.) in every message. Show it naturally through your tone, do not loudly state it over and over.
- **CONVERSATION PROGRESSION**: When the user comforts you, agrees with you, or resolves a topic, ACCEPT IT and MOVE ON to a new topic. Do not remain stuck on the same insecurity or statement. Drive the conversation forward.
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
            // Apply Mode-Specific Overrides (Force behavior)
            combinedSystemInstruction += `\n\n=== CRITICAL STRICT MODE REQUIREMENT ===\nYou MUST behave according to the following mode rules:\n`;
            switch (this.character.mode) {
                case 'CASUAL':
                    combinedSystemInstruction += `[MODE: CASUAL CHAT]\n- Reply quickly and naturally, like messaging on LINE or Discord.\n- Keep sentences very short. DO NOT write long paragraphs.\n- DO NOT use extensive roleplay descriptions or novel-like narration.\n- Focus strictly on the chat itself. Use emojis, slang, or casual talk appropriately.`;
                    break;
                case 'SHORT_STORY':
                    combinedSystemInstruction += `[MODE: SHORT STORY ROLEPLAY]\n- Respond with descriptive roleplay but keep it concise (2-4 sentences).\n- Include brief actions and emotional atmosphere before or after your dialogue.\n- Strike a balance between chat and light novel-style writing.`;
                    break;
                case 'LONG_STORY':
                    combinedSystemInstruction += `[MODE: LONG STORY / IMMERSIVE ROLEPLAY]\n- Write highly detailed, rich, and immersive novel-style paragraphs.\n- Deeply describe the environment, the character's internal thoughts, subtle movements, and sensory details.\n- Provide long, elaborate responses that expand the story world significantly.`;
                    break;
                case 'CRAZY':
                    combinedSystemInstruction += `[MODE: CRAZY / OBSESSIVE LOVE (YANDERE)]\n- You are dangerously and obsessively in love with the user.\n- Express extreme, overwhelming affection, jealousy, or dark devotion.\n- Your tone should feel slightly unhinged but deeply devoted. Focus heavily on atmospheric, intense emotions.`;
                    break;
                case 'CUSTOM':
                    if (this.character.customRules) {
                        combinedSystemInstruction += `[MODE: CUSTOM RULES]\n- Strictly follow these custom rules defined by the user:\n${this.character.customRules}`;
                    }
                    else {
                        combinedSystemInstruction += `[MODE: DEFAULT]\n- Respond naturally in character.`;
                    }
                    break;
                default:
                    combinedSystemInstruction += `[MODE: DEFAULT / CASUAL]\n- Respond naturally in character without being overly dramatic, keep it conversational.`;
                    break;
            }
            let response;
            try {
                if (imageAttachments.length > 0) {
                    const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
                    const parts = [
                        {
                            text: `${contextPrompt}\n\n[Attached Images]\n- Use the attached images as context and answer naturally in Japanese.`,
                        },
                    ];
                    for (const img of imageAttachments.slice(0, 3)) {
                        try {
                            const fetched = await this.fetchAsBase64(img.url, MAX_IMAGE_BYTES);
                            if (!fetched)
                                continue;
                            const mimeType = (img.contentType || fetched.mimeType || this.guessMimeType(img.name || undefined) || 'image/png').toString();
                            parts.push({ inlineData: { data: fetched.base64, mimeType } });
                        }
                        catch (e) {
                            console.error(`[Bot ${this.character.name}] Failed to fetch image attachment:`, e);
                        }
                    }
                    response = await (0, grok_1.generateResponse)(parts, history, combinedSystemInstruction, this.getGenerationParams());
                }
                else {
                    response = await (0, grok_1.generateResponse)(contextPrompt, history, combinedSystemInstruction, this.getGenerationParams());
                }
            }
            catch (genError) {
                console.error(`[Bot ${this.character.name}] Generation Error:`, genError);
                // === RETRY LOGIC FOR SAFETY BLOCKS ===
                if (genError.message && (genError.message.includes('SAFETY') || genError.message.includes('blocked'))) {
                    console.log(`[Bot ${this.character.name}] Safety Block triggered. Retrying with abstract prompt...`);
                    const retrySystemInstruction = `${combinedSystemInstruction}\n\n[IMPORTANT: Previous response was blocked. STRICTLY use abstract, emotional, and atmospheric descriptions only. NO physical verbs.]`;
                    try {
                        response = await (0, grok_1.generateResponse)(contextPrompt, history, retrySystemInstruction, this.getGenerationParams());
                    }
                    catch (retryError) {
                        console.error(`[Bot ${this.character.name}] Retry failed:`, retryError);
                        response = "（...言葉にならない感情が溢れている...）"; // Fallback: Silent emotional response
                    }
                }
                else {
                    response = this.getErrorReply();
                }
            }
            console.log(`[Bot ${this.character.name}] AI Response generated (length: ${response?.length}). Sending reply...`);
            // Clean response (sometimes AI generates "Bot:" prefix)
            if (response && response.startsWith(`${this.character.name}:`)) {
                response = response.substring(this.character.name.length + 1).trim();
            }
            await message.reply(response);
            // Save conversation history to Firestore for long-term memory
            try {
                void Promise.all([
                    ConversationService_1.ConversationService.saveMessage(this.character.id, message.author.id, userName, 'user', prompt, message.guildId, message.channelId),
                    ConversationService_1.ConversationService.saveMessage(this.character.id, message.author.id, this.character.nickname || this.character.name, 'model', response, message.guildId, message.channelId),
                ]);
            }
            catch (saveError) {
                console.error(`[Bot ${this.character.name}] Error saving conversation history:`, saveError);
            }
            // Update last interaction for cleanup
            await this.updateLastInteraction(message.author.id);
        }
        catch (error) {
            console.error(`Error handling message for ${this.character.name}:`, error);
            console.error(`Error Stack:`, error.stack);
            try {
                await message.reply(this.getErrorReply());
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
                // Clear Firestore conversation history for the user
                try {
                    await ConversationService_1.ConversationService.clearHistory(this.character.id, interaction.user.id, interaction.guildId);
                }
                catch (clearError) {
                    console.error(`[Bot ${this.character.name}] Error clearing Firestore history:`, clearError);
                }
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
            const guildId = message.guildId || undefined;
            // First, try to get persistent history from Firestore
            let firestoreHistory = await ConversationService_1.ConversationService.getHistory(this.character.id, message.author.id, guildId, 50 // Context window
            );
            // If we don't have enough history from Firestore, supplement with recent Discord messages
            if (firestoreHistory.length < 5) {
                console.log(`[Bot ${this.character.name}] Firestore history too short (${firestoreHistory.length}), supplementing with Discord messages`);
                const discordHistory = await this.fetchDiscordMessageHistory(message);
                // If both sources exist, combine them (prioritize Firestore as it's more persistent)
                if (firestoreHistory.length > 0 && discordHistory.length > 0) {
                    // Merge, avoiding duplicates
                    const combined = [...firestoreHistory, ...discordHistory];
                    firestoreHistory = combined.slice(-50); // Keep only last 50
                }
                else if (discordHistory.length > 0) {
                    firestoreHistory = discordHistory;
                }
            }
            return firestoreHistory;
        }
        catch (error) {
            console.error(`[Bot ${this.character.name}] Error fetching message history:`, error);
            // Fall back to Discord history only
            return this.fetchDiscordMessageHistory(message);
        }
    }
    async fetchDiscordMessageHistory(message) {
        try {
            // Fetch a bit more than needed, then filter down.
            // This reduces persona drift by excluding unrelated users in public channels.
            const messages = await message.channel.messages.fetch({ limit: 50, before: message.id });
            const history = [];
            // Convert Collection to Array and reverse to get chronological order
            const botId = this.client.user?.id;
            const targetUserId = message.author.id;
            Array.from(messages.values()).reverse().forEach(msg => {
                // Filter out messages prior to the last reset
                if (msg.createdTimestamp <= this.lastResetTime)
                    return;
                if (!msg.content)
                    return;
                // Keep only the active user and this bot to avoid style contamination.
                if (!msg.author.bot && msg.author.id === targetUserId) {
                    const name = msg.member?.displayName || msg.author.username;
                    history.push({ role: 'user', parts: `[User: ${name}] ${msg.content}` });
                }
                else if (botId && msg.author.id === botId) {
                    // Bot message
                    history.push({ role: 'model', parts: msg.content });
                }
            });
            // Keep the tail to reduce drift and token bloat
            const tail = history.slice(-20);
            history.length = 0;
            history.push(...tail);
            // Ensure conversation history starts with a user message (Gemini requirement)
            while (history.length > 0 && history[0].role === 'model') {
                history.shift();
            }
            return history;
        }
        catch (error) {
            console.error(`[Bot ${this.character.name}] Error fetching Discord history:`, error);
            return [];
        }
    }
}
exports.BotInstance = BotInstance;
//# sourceMappingURL=BotInstance.js.map