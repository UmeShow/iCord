require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ChannelType } = require('discord.js');
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

console.log('=== Server Initialization ===');
console.log('Environment variables loaded');
console.log('Firebase Project ID:', process.env.FIREBASE_PROJECT_ID);
console.log('Discord Client ID:', process.env.DISCORD_CLIENT_ID);

// Firebase Admin SDKの初期化
try {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,  // ✅ NEXT_PUBLIC_ではなくFIREBASE_を使用
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
  console.log('Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error);
  process.exit(1);
}

// Firestoreの初期化
const db = getFirestore();
console.log('Firestore initialized');

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

// CORS middleware
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:3004',
      'http://localhost:3005',
      'http://192.168.1.8:3000',
      'http://192.168.1.8:3001',
      'http://192.168.1.8:3002',
      'http://192.168.1.8:3003',
      'https://www.icord.me',
      'https://icord.me'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked: ${origin}`);
      callback(null, true); // 開発環境では許可
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Discord.js events
client.once('ready', async () => {
  console.log(`\n✅ Bot is ready! Logged in as ${client.user.tag}`);
  
  // スラッシュコマンドを登録
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
  try {
    console.log('Started refreshing application (/) commands.');
    const result = await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands }
    );
    console.log(`✅ Successfully registered ${result.length} application (/) command(s).`);
  } catch (error) {
    console.error('❌ Error registering slash commands:', error);
  }
});

// Discord interaction handler
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

      // 即座に応答
      await interaction.reply({
        content: `⏳ 部屋番号を生成中...`,
        flags: 64
      });

      // バックグラウンドで保存
      setImmediate(async () => {
        try {
          console.log(`\n📝 Creating room: ${roomNumber}`);
          console.log(`   Channel: ${channel.name} (${channel.id})`);
          console.log(`   Guild: ${interaction.guildId}`);

          const roomData = {
            channelId: channel.id,
            guildId: interaction.guildId,
            createdAt: new Date().toISOString()
          };

          await db.collection('rooms').doc(roomNumber).set(roomData);

          console.log(`✅ Room saved to Firestore: ${roomNumber}`);

          // 検証: 保存したデータを確認
          const verify = await db.collection('rooms').doc(roomNumber).get();
          console.log(`✓ Verification - Room exists: ${verify.exists}`);

          await interaction.editReply({
            content: `✅ iCord部屋番号が生成されました！\n部屋番号: \`${roomNumber}\`\n連携チャンネル: ${channel.name}\n\nこの部屋番号をiCord.meで入力すると、このチャンネルと接続できます。`
          });
        } catch (error) {
          console.error(`❌ Error saving room:`, error);
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
      console.error('❌ Error in command handler:', error);
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

  console.log(`\n📥 GET /api/rooms/${roomId}/messages`);

  try {
    // Firestoreから部屋情報を取得
    const roomDoc = await db.collection('rooms').doc(roomId).get();
    
    console.log(`  Room exists: ${roomDoc.exists}`);
    
    if (!roomDoc.exists) {
      console.log(`  ❌ Room not found in Firestore`);
      return res.status(404).json({ 
        error: 'Room not found',
        roomId: roomId 
      });
    }

    const room = roomDoc.data();
    console.log(`  Channel ID: ${room.channelId}`);
    
    // Discord チャンネルから最新メッセージを取得
    const channel = await client.channels.fetch(room.channelId);
    const messages = await channel.messages.fetch({ limit: 50 });
    
    const formattedMessages = Array.from(messages.values())
      .map(msg => ({
        id: msg.id,
        content: msg.content,
        author: msg.author.username,
        timestamp: msg.createdTimestamp
      }))
      .reverse();

    console.log(`  ✅ Fetched ${formattedMessages.length} messages`);
    res.json({ messages: formattedMessages });
  } catch (error) {
    console.error(`  ❌ Error:`, error.message);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
});

app.post('/api/rooms/:roomId/messages', async (req, res) => {
  const { roomId } = req.params;
  const { content, author } = req.body;

  console.log(`\n📤 POST /api/rooms/${roomId}/messages`);
  console.log(`  Author: ${author}`);
  console.log(`  Content: ${content.substring(0, 50)}...`);

  try {
    // Firestoreから部屋情報を取得
    const roomDoc = await db.collection('rooms').doc(roomId).get();
    
    if (!roomDoc.exists) {
      console.log(`  ❌ Room not found`);
      return res.status(404).json({ error: 'Room not found' });
    }

    const room = roomDoc.data();
    const channel = await client.channels.fetch(room.channelId);
    await channel.send(`**${author}**: ${content}`);
    
    console.log(`  ✅ Message sent successfully`);
    res.json({ success: true });
  } catch (error) {
    console.error(`  ❌ Error:`, error.message);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`\n🚀 Server running on port ${port}`);
  console.log(`📍 API Base URL: http://localhost:${port}/api`);
});

// Start Discord bot
client.login(process.env.DISCORD_BOT_TOKEN);
