"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupOldData = cleanupOldData;
const firebase_1 = require("../database/firebase");
const config_1 = require("../config/config");
async function cleanupOldData() {
    try {
        const retentionDays = config_1.config.safety.dataRetentionDays;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        console.log(`Running cleanup for data older than ${cutoffDate.toISOString()}...`);
        // In Firestore, we would typically query for documents where 'lastInteraction' < cutoffDate
        // However, Firestore requires a composite index for this query if we also filter by other fields.
        // For simplicity, we'll just query users who haven't interacted in a long time.
        const usersRef = firebase_1.db.collection('users');
        const snapshot = await usersRef.where('lastInteraction', '<', cutoffDate).get();
        if (snapshot.empty) {
            console.log('No old user data found to clean up.');
            return;
        }
        const batch = firebase_1.db.batch();
        let count = 0;
        snapshot.forEach(doc => {
            // In a real app, you might want to delete related data (like chat logs) first.
            // Here we just delete the user consent record.
            batch.delete(doc.ref);
            count++;
        });
        await batch.commit();
        console.log(`Cleaned up ${count} inactive user records.`);
    }
    catch (error) {
        console.error('Error during data cleanup:', error);
    }
}
//# sourceMappingURL=cleanup.js.map