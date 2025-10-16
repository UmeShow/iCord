require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const admin = require('firebase-admin');
const express = require('express');

// Initialize Firebase Admin SDK
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Initialize Discord Bot
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once('ready', () => {
  console.log('Discord bot is ready!');
});

client.login(process.env.DISCORD_BOT_TOKEN);

const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

// Listen for new messages on Discord and add them to Firestore
client.on('messageCreate', async (message) => {
  if (message.author.bot || message.channel.id !== DISCORD_CHANNEL_ID) return;

  try {
    await db.collection('messages').add({
      text: message.content,
      author: message.author.username,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('Message from Discord saved to Firestore.');
  } catch (error) {
    console.error('Error saving message to Firestore: ', error);
  }
});

// Listen for new messages in Firestore and send them to Discord
db.collection('messages').onSnapshot(snapshot => {
  snapshot.docChanges().forEach(change => {
    if (change.type === 'added') {
      const newMessage = change.doc.data();
      // To avoid echoing messages from the bot itself
      if (newMessage.author !== 'WebAppUser') return;

      const channel = client.channels.cache.get(DISCORD_CHANNEL_ID);
      if (channel) {
        channel.send(`${newMessage.author}: ${newMessage.text}`);
      }
    }
  });
});

// Express server to keep the process alive on Render
const app = express();
const port = process.env.PORT || 3001;
app.get('/', (req, res) => {
  res.send('Server is running.');
});
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
