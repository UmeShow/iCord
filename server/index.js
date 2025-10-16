require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ChannelType } = require('discord.js');
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, get } = require('firebase/database');

// Firebaseの設定
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL // Realtime Database用
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);

// Initialize Discord Bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.DirectMessages
  ]
});

// スラッシュコマンドの定義
const commands = [
  new SlashCommandBuilder()
    .setName('settings')
    .setDescription('iCordの部屋番号を生成します')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('連携するDiscordチャンネルを選択')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
];

// Express server setup
const app = express();
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
}));
app.use(express.json());

// Discord.js events
client.once('ready', async () => {
  console.log('Bot is ready!');
  
  // スラッシュコマンドを登録
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
  try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands }
    );
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error registering slash commands:', error);
  }
});

// スラッシュコマンドのハンドリング
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'settings') {
    try {
      const channel = interaction.options.getChannel('channel');
      if (!channel || channel.type !== ChannelType.GuildText) {
        await interaction.reply({
          content: 'テキストチャンネルを選択してください。',
          flags: 64
        });
        return;
      }

      const roomNumber = crypto.randomBytes(3).toString('hex'); // 6文字の部屋番号を生成

      // Firebase Realtime Databaseに部屋情報を保存
      const roomRef = ref(database, `rooms/${roomNumber}`);
      await set(roomRef, {
        channelId: channel.id,
        guildId: interaction.guildId,
        createdAt: Date.now()
      });

      await interaction.reply({
        content: `✅ iCord部屋番号が生成されました！\n部屋番号: \`${roomNumber}\`\n連携チャンネル: ${channel.name}\n\nこの部屋番号をiCord.meで入力すると、このチャンネルと接続できます。`,
        flags: 64
      });
    } catch (error) {
      console.error('Error creating room:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'エラーが発生しました。もう一度お試しください。',
          flags: 64
        });
      }
    }
  }
});

// API Endpoints
app.get('/api/rooms/:roomId/messages', async (req, res) => {
  const { roomId } = req.params;

  try {
    // Firebase Realtime Databaseから部屋情報を取得
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    
    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const room = snapshot.val();
    const channel = await client.channels.fetch(room.channelId);
    const messages = await channel.messages.fetch({ limit: 50 });
    
    const formattedMessages = Array.from(messages.values()).map(msg => ({
      id: msg.id,
      content: msg.content,
      author: msg.author.username,
      timestamp: msg.createdTimestamp
    })).reverse();

    res.json({ messages: formattedMessages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/rooms/:roomId/messages', async (req, res) => {
  const { roomId } = req.params;
  const { content, author } = req.body;

  try {
    // Firebase Realtime Databaseから部屋情報を取得
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    
    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const room = snapshot.val();
    const channel = await client.channels.fetch(room.channelId);
    await channel.send(`${author}: ${content}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Start Discord bot
client.login(process.env.DISCORD_BOT_TOKEN);
