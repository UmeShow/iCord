require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ChannelType } = require('discord.js');
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Firebase Admin SDKの初期化
initializeApp({
  credential: cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  })
});

// Firestoreの初期化
const db = getFirestore();

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

      const roomNumber = crypto.randomBytes(3).toString('hex');

      // 即座に応答（これが重要）
      await interaction.reply({
        content: `⏳ 部屋番号を生成中...`,
        flags: 64
      });

      // その後、バックグラウンドで保存（エラーハンドリング付き）
      setImmediate(async () => {
        try {
          await db.collection('rooms').doc(roomNumber).set({
            channelId: channel.id,
            guildId: interaction.guildId,
            createdAt: new Date()
          });

          // 初期メッセージを編集して最終結果を表示
          await interaction.editReply({
            content: `✅ iCord部屋番号が生成されました！\n部屋番号: \`${roomNumber}\`\n連携チャンネル: ${channel.name}\n\nこの部屋番号をiCord.meで入力すると、このチャンネルと接続できます。`
          });

          console.log(`Room created: ${roomNumber} for channel ${channel.name}`);
        } catch (error) {
          console.error('Error saving room:', error);
          try {
            await interaction.editReply({
              content: `❌ エラーが発生しました: ${error.message}`
            });
          } catch (editError) {
            console.error('Error editing reply:', editError);
          }
        }
      });
    } catch (error) {
      console.error('Error in command handler:', error);
      if (!interaction.replied && !interaction.deferred) {
        try {
          await interaction.reply({
            content: 'エラーが発生しました。もう一度お試しください。',
            flags: 64
          });
        } catch (replyError) {
          console.error('Error sending reply:', replyError);
        }
      }
    }
  }
});

// API Endpoints
app.get('/api/rooms/:roomId/messages', async (req, res) => {
  const { roomId } = req.params;

  try {
    // Firestoreから部屋情報を取得
    const roomDoc = await db.collection('rooms').doc(roomId).get();
    
    if (!roomDoc.exists) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const room = roomDoc.data();
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
    // Firestoreから部屋情報を取得
    const roomDoc = await db.collection('rooms').doc(roomId).get();
    
    if (!roomDoc.exists) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const room = roomDoc.data();
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
