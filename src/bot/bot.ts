import { Client, GatewayIntentBits, Partials, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { config } from '../config/config';
import { db } from '../database/firebase';
import { IUser } from '../database/models/User';
import { ICharacter } from '../database/models/Character';
import { generateResponse } from '../ai/gemini';

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

const cooldowns = new Map();

client.once(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  console.log(`📩 Message received: ${message.content} from ${message.author.tag}`); // Debug log

  if (message.author.bot) return;

  // Rate Limiting (Simple in-memory cooldown)
  const COOLDOWN_SECONDS = 2;
  const now = Date.now();
  const lastMessageTime = cooldowns.get(message.author.id) || 0;

  if (now - lastMessageTime < COOLDOWN_SECONDS * 1000) {
    return;
  }

  cooldowns.set(message.author.id, now);

  // 1. Check Consent
  const userRef = db.collection('users').doc(message.author.id);
  const userDoc = await userRef.get();
  const userData = userDoc.data() as IUser | undefined;
  
  if (!userDoc.exists || !userData?.hasConsented) {
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('consent_yes')
          .setLabel('Agree & Chat')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('consent_no')
          .setLabel('Decline')
          .setStyle(ButtonStyle.Danger),
      );

    const embed = new EmbedBuilder()
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
  const charactersRef = db.collection('characters');
  const snapshot = await charactersRef.where('ownerId', '==', message.author.id).limit(1).get();
  
  const firstDoc = snapshot.docs[0];
  const character = firstDoc ? firstDoc.data() as ICharacter : null;
  
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
        role: m.author.id === client.user?.id ? 'model' : 'user',
        parts: m.content
    })).filter(m => m.parts.length > 0); // Filter empty messages

    // Exclude the current message from history as it is the prompt
    const previousHistory = history.slice(0, -1) as { role: 'user' | 'model'; parts: string }[];
    const currentPrompt = message.content;

    const response = await generateResponse(currentPrompt, previousHistory, systemInstruction);
    
    // Split response if too long (Discord limit 2000)
    if (response.length > 2000) {
        const chunks = response.match(/[\s\S]{1,2000}/g) || [];
        for (const chunk of chunks) {
            await message.reply(chunk);
        }
    } else {
        await message.reply(response);
    }

  } catch (error) {
      console.error('Error in message handler:', error);
      await message.reply("I'm having trouble thinking right now.");
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'consent_yes') {
        const userRef = db.collection('users').doc(interaction.user.id);
        const newUser: IUser = {
            discordId: interaction.user.id,
            hasConsented: true,
            consentDate: new Date(),
            lastInteraction: new Date()
        };
        
        await userRef.set(newUser, { merge: true });
        await interaction.reply({ content: 'Thank you! You can now chat with me.', ephemeral: true });
    } else if (interaction.customId === 'consent_no') {
        await interaction.reply({ content: 'Understood. We will not store your data. You cannot use the bot without consent.', ephemeral: true });
    }
});
