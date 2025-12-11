"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config/config");
const express_1 = __importDefault(require("express"));
const cleanup_1 = require("./utils/cleanup");
require("./database/firebase"); // Initialize Firebase
const BotManager_1 = require("./bot/BotManager");
const app = (0, express_1.default)();
// Start the Bot Manager
// This will automatically fetch characters from Firestore and start their bots
new BotManager_1.BotManager();
// Run cleanup on startup
(0, cleanup_1.cleanupOldData)();
// Schedule cleanup every 24 hours
setInterval(cleanup_1.cleanupOldData, 24 * 60 * 60 * 1000);
// Basic Health Check Server (for hosting platforms)
app.get('/', (req, res) => {
    res.send('iCord.me Bot Manager is running!');
});
app.listen(config_1.config.server.port, () => {
    console.log(`Server is running on port ${config_1.config.server.port}`);
});
//# sourceMappingURL=index.js.map