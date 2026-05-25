"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.client = void 0;
const discord_js_1 = require("discord.js");
const config_1 = require("../config/config");
const firebase_1 = require("../database/firebase");
const gemini_1 = require("../ai/gemini");
const commands_1 = require("./commands");
exports.client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.MessageContent,
        discord_js_1.GatewayIntentBits.DirectMessages,
    ],
    partials: [discord_js_1.Partials.Channel],
});
const cooldowns = new Map();
exports.client.once(discord_js_1.Events.ClientReady, async (c) => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
    // Register Slash Commands
    const rest = new discord_js_1.REST({ version: '10' }).setToken(config_1.config.discord.token);
    try {
        console.log('Started refreshing application (/) commands.');
        const commandData = commands_1.commands.map(cmd => cmd.data.toJSON());
        await rest.put(discord_js_1.Routes.applicationCommands(config_1.config.discord.clientId), { body: commandData });
        console.log('Successfully reloaded application (/) commands.');
    }
    catch (error) {
        console.error(error);
    }
});
exports.client.on(discord_js_1.Events.MessageCreate, async (message) => {
    console.log(`📩 Message received: ${message.content} from ${message.author.tag}`); // Debug log
    if (message.author.bot)
        return;
    // Rate Limiting (Simple in-memory cooldown)
    const COOLDOWN_SECONDS = 2;
    const now = Date.now();
    const lastMessageTime = cooldowns.get(message.author.id) || 0;
    if (now - lastMessageTime < COOLDOWN_SECONDS * 1000) {
        return;
    }
    cooldowns.set(message.author.id, now);
    // 1. Check Consent
    const userRef = firebase_1.db.collection('users').doc(message.author.id);
    const userDoc = await userRef.get();
    const userData = userDoc.data();
    if (!userDoc.exists || !userData?.hasConsented) {
        const row = new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('consent_yes')
            .setLabel('Agree & Chat')
            .setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder()
            .setCustomId('consent_no')
            .setLabel('Decline')
            .setStyle(discord_js_1.ButtonStyle.Danger));
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle('Terms of Service & Privacy Policy')
            .setDescription('Before we can chat, you must agree to our data collection policy.\n\nWe collect:\n- Your messages for conversation history (stored for 30 days).\n- Your User ID.\n\nWe do NOT use your data for training public models without explicit opt-in.\n\nDo you agree?')
            .setColor(0x0099FF);
        await message.reply({ embeds: [embed], components: [row] });
        return;
    }
    // 2. Update interaction time
    await userRef.update({ lastInteraction: new Date() });
    // 3. Get Character
    // Logic: Find a character created by the user. If multiple, pick the first one for now.
    const charactersRef = firebase_1.db.collection('characters');
    const snapshot = await charactersRef.where('ownerId', '==', message.author.id).limit(1).get();
    const firstDoc = snapshot.docs[0];
    const character = firstDoc ? firstDoc.data() : null;
    // Default persona if no character found
    const systemInstruction = character
        ? `You are ${character.name}. ${character.systemInstruction || character.personality || ''}. Tone: ${character.tone || 'Casual'}. Language: Japanese. Always respond in Japanese unless asked otherwise.`
        : "You are a helpful AI assistant named iCord. Please respond in Japanese.";
    // 4. Generate Response
    try {
        await message.channel.sendTyping();
        // Fetch context (last 10 messages)
        const messages = await message.channel.messages.fetch({ limit: 10 });
        const history = messages.reverse().map(m => ({
            role: m.author.id === exports.client.user?.id ? 'model' : 'user',
            parts: m.content
        })).filter(m => m.parts.length > 0); // Filter empty messages
        // Exclude the current message from history as it is the prompt
        const previousHistory = history.slice(0, -1);
        const currentPrompt = message.content;
        const response = await (0, gemini_1.generateResponse)(currentPrompt, previousHistory, systemInstruction);
        // Split response if too long (Discord limit 2000)
        if (response.length > 2000) {
            const chunks = response.match(/[\s\S]{1,2000}/g) || [];
            for (const chunk of chunks) {
                await message.reply(chunk);
            }
        }
        else {
            await message.reply(response);
        }
    }
    catch (error) {
        console.error('Error in message handler:', error);
        await message.reply("I'm having trouble thinking right now.");
    }
});
exports.client.on(discord_js_1.Events.InteractionCreate, async (interaction) => {
    // Handle Slash Commands
    if (interaction.isChatInputCommand()) {
        const command = commands_1.commands.find(c => c.data.name === interaction.commandName);
        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }
        try {
            await command.execute(exports.client, interaction);
        }
        catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error executing this command!', ephemeral: true });
            }
            else {
                await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
            }
        }
        return;
    }
    if (!interaction.isButton())
        return;
    if (interaction.customId === 'consent_yes') {
        const userRef = firebase_1.db.collection('users').doc(interaction.user.id);
        const newUser = {
            discordId: interaction.user.id,
            hasConsented: true,
            consentDate: new Date(),
            lastInteraction: new Date()
        };
        await userRef.set(newUser, { merge: true });
        await interaction.reply({ content: 'Thank you! You can now chat with me.', ephemeral: true });
    }
    else if (interaction.customId === 'consent_no') {
        await interaction.reply({ content: 'Understood. We will not store your data. You cannot use the bot without consent.', ephemeral: true });
    }
});
// Prevent process from crashing on unhandled errors
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});
//# sourceMappingURL=bot.js.map