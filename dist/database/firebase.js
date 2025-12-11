"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const admin = __importStar(require("firebase-admin"));
const config_1 = require("../config/config");
// Initialize Firebase Admin SDK
// In a real production environment, you might want to use applicationDefault() 
// if hosting on GCP, or provide a service account JSON file.
// Here we use environment variables for flexibility.
// Validate config presence
if (!config_1.config.firebase.projectId || !config_1.config.firebase.clientEmail || !config_1.config.firebase.privateKey) {
    console.error('❌ Firebase configuration is missing or incomplete.');
    console.error('Please check your .env file and ensure the following variables are set:');
    console.error(`- FIREBASE_PROJECT_ID: ${config_1.config.firebase.projectId ? '✅ Set' : '❌ Missing'}`);
    console.error(`- FIREBASE_CLIENT_EMAIL: ${config_1.config.firebase.clientEmail ? '✅ Set' : '❌ Missing'}`);
    console.error(`- FIREBASE_PRIVATE_KEY: ${config_1.config.firebase.privateKey ? '✅ Set' : '❌ Missing'}`);
    throw new Error('Firebase configuration is missing. Cannot start application.');
}
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: config_1.config.firebase.projectId,
                clientEmail: config_1.config.firebase.clientEmail,
                privateKey: config_1.config.firebase.privateKey,
            }),
        });
        console.log('✅ Firebase Admin Initialized');
    }
    catch (error) {
        console.error('❌ Firebase initialization error:', error);
        throw error; // Re-throw to stop execution so we don't get "default app does not exist" later
    }
}
exports.db = admin.firestore();
//# sourceMappingURL=firebase.js.map