require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

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
        .setRequired(true)
    )
];

// Express server setup
const app = express();
app.use(cors({
  origin: process.env.CORS_ORIGIN
}));
app.use(express.json());

// メモリ内で部屋番号とチャンネルIDのマッピングを保持
const rooms = new Map();

// Discord.js events
client.once('ready', async () => {
  console.log('Bot is ready!');
  
  // スラッシュコマンドを登録
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
  try {
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands }
    );
    console.log('Slash commands registered');
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
      const roomNumber = crypto.randomBytes(3).toString('hex'); // 6文字の部屋番号を生成

      // 部屋情報を保存
      rooms.set(roomNumber, {
        channelId: channel.id,
        guildId: interaction.guildId,
        createdAt: new Date()
      });

      await interaction.reply({
        content: `✅ iCord部屋番号が生成されました！\n部屋番号: \`${roomNumber}\`\n連携チャンネル: ${channel.name}\n\nこの部屋番号をiCord.meで入力すると、このチャンネルと接続できます。`,
        ephemeral: true
      });
    } catch (error) {
      console.error('Error creating room:', error);
      await interaction.reply({
        content: 'エラーが発生しました。もう一度お試しください。',
        ephemeral: true
      });
    }
  }
});

// Discordチャンネルの新しいメッセージを監視
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // このチャンネルに関連付けられている部屋を探す
  for (const [roomNumber, room] of rooms.entries()) {
    if (room.channelId === message.channelId) {
      // WebSocket等でフロントエンドに通知する実装をここに追加可能
      console.log(`New message in room ${roomNumber}: ${message.content}`);
    }
  }
});

// API Endpoints
app.get('/api/rooms/:roomId/messages', async (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  try {
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
  const room = rooms.get(roomId);

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  try {
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
