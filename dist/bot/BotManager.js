"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotManager = void 0;
const firebase_1 = require("../database/firebase");
const BotInstance_1 = require("./BotInstance");
class BotManager {
    bots = new Map();
    constructor() {
        this.startSync();
    }
    startSync() {
        console.log('Starting Bot Manager Sync...');
        // Listen for real-time updates from Firestore
        firebase_1.db.collection('characters').onSnapshot((snapshot) => {
            console.log(`Received snapshot update. Total characters: ${snapshot.size}`);
            snapshot.docChanges().forEach((change) => {
                const characterData = change.doc.data();
                const characterId = change.doc.id;
                // Add ID to data
                const character = { ...characterData, id: characterId };
                if (change.type === 'added') {
                    this.addBot(character);
                }
                if (change.type === 'modified') {
                    this.updateBot(character);
                }
                if (change.type === 'removed') {
                    this.removeBot(characterId);
                }
            });
        });
    }
    async addBot(character) {
        if (character.isActive === false) {
            return;
        }
        if (!character.botToken) {
            console.log(`Skipping ${character.name} (No token)`);
            return;
        }
        // Check if already running (shouldn't happen with 'added' event but good safety)
        if (this.bots.has(character.id))
            return;
        console.log(`Initializing bot for ${character.name}...`);
        const bot = new BotInstance_1.BotInstance(character);
        await bot.start();
        this.bots.set(character.id, bot);
    }
    updateBot(character) {
        const bot = this.bots.get(character.id);
        // Case 1: Bot is running, but should be stopped (isActive = false)
        if (bot && character.isActive === false) {
            this.removeBot(character.id);
            return;
        }
        // Case 2: Bot is NOT running, but should be started (isActive = true)
        if (!bot && character.isActive !== false) {
            this.addBot(character);
            return;
        }
        if (bot) {
            // Case 3: Token changed -> Restart
            if (bot.currentToken !== character.botToken) {
                console.log(`Token changed for ${character.name}. Restarting...`);
                this.removeBot(character.id);
                this.addBot(character);
            }
            else {
                // Case 4: Just update data
                console.log(`Updating bot for ${character.name}...`);
                bot.updateCharacter(character);
            }
        }
    }
    removeBot(characterId) {
        const bot = this.bots.get(characterId);
        if (bot) {
            console.log(`Stopping bot ${characterId}...`);
            bot.stop();
            this.bots.delete(characterId);
        }
    }
}
exports.BotManager = BotManager;
//# sourceMappingURL=BotManager.js.map