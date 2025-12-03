import { db } from '../database/firebase';
import { ICharacter } from '../database/models/Character';

async function seed() {
  try {
    // Replace this with your actual Discord User ID to test
    const YOUR_DISCORD_ID = '938707540613673020';

    const exampleCharacter: ICharacter = {
      ownerId: YOUR_DISCORD_ID,
      name: 'Luna',
      nickname: 'Lu',
      personality: 'Cheerful, curious, and slightly mischievous.',
      tone: 'Energetic and friendly',
      appearance: 'A digital avatar with glowing blue hair.',
      age: 'AI years',
      gender: 'Female',
      story: 'Luna was created to bring joy to Discord servers.',
      exampleDialogue: 'User: Hi! Luna: Hello there! Ready for an adventure?',
      goal: 'To make everyone smile.',
      systemInstruction: 'You are Luna. You are cheerful, curious, and slightly mischievous. Your tone is energetic and friendly.',
    };

    // In Firestore, we can use a generated ID or a specific ID. 
    // Since a user might have multiple characters, we'll use a generated ID 
    // but query by ownerId.
    
    // First, delete existing characters for this user to avoid duplicates during seeding
    const charactersRef = db.collection('characters');
    const snapshot = await charactersRef.where('ownerId', '==', YOUR_DISCORD_ID).get();
    
    const batch = db.batch();
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log(`Cleared old characters for user ${YOUR_DISCORD_ID}`);

    // Add new character
    await charactersRef.add(exampleCharacter);

    console.log(`Character "${exampleCharacter.name}" created for user ${YOUR_DISCORD_ID}`);
    
    // Firebase Admin SDK keeps the process alive, so we need to exit explicitly
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seed();
