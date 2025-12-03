import { config } from './config/config';
import express from 'express';
import { cleanupOldData } from './utils/cleanup';
import './database/firebase'; // Initialize Firebase
import { BotManager } from './bot/BotManager';

const app = express();

// Start the Bot Manager
// This will automatically fetch characters from Firestore and start their bots
new BotManager();

// Run cleanup on startup
cleanupOldData();
// Schedule cleanup every 24 hours
setInterval(cleanupOldData, 24 * 60 * 60 * 1000);

// Basic Health Check Server (for hosting platforms)
app.get('/', (req, res) => {
  res.send('iCord.me Bot Manager is running!');
});

app.listen(config.server.port, () => {
  console.log(`Server is running on port ${config.server.port}`);
});
