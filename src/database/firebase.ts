import * as admin from 'firebase-admin';
import { config } from '../config/config';

// Initialize Firebase Admin SDK
// In a real production environment, you might want to use applicationDefault() 
// if hosting on GCP, or provide a service account JSON file.
// Here we use environment variables for flexibility.

// Validate config presence
if (!config.firebase.projectId || !config.firebase.clientEmail || !config.firebase.privateKey) {
  console.error('❌ Firebase configuration is missing or incomplete.');
  console.error('Please check your .env file and ensure the following variables are set:');
  console.error(`- FIREBASE_PROJECT_ID: ${config.firebase.projectId ? '✅ Set' : '❌ Missing'}`);
  console.error(`- FIREBASE_CLIENT_EMAIL: ${config.firebase.clientEmail ? '✅ Set' : '❌ Missing'}`);
  console.error(`- FIREBASE_PRIVATE_KEY: ${config.firebase.privateKey ? '✅ Set' : '❌ Missing'}`);
  
  throw new Error('Firebase configuration is missing. Cannot start application.');
}

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebase.projectId,
        clientEmail: config.firebase.clientEmail,
        privateKey: config.firebase.privateKey,
      }),
    });
    console.log('✅ Firebase Admin Initialized');
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    throw error; // Re-throw to stop execution so we don't get "default app does not exist" later
  }
}

export const db = admin.firestore();
