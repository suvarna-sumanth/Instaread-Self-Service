import admin from 'firebase-admin';

// This function ensures we initialize the app only once.
function getDb() {
  if (admin.apps.length === 0) {
    const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;

    if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
      throw new Error('Firebase credentials (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) are not fully set in environment variables.');
    }

    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: FIREBASE_PROJECT_ID,
          clientEmail: FIREBASE_CLIENT_EMAIL,
          privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    } catch (error) {
      const originalMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      console.error('!!! FATAL: FIREBASE INITIALIZATION FAILED !!!');
      console.error('Original Error:', originalMessage);
      // Re-throw to give more details
      throw new Error(`Firebase Admin SDK initialization failed: ${originalMessage}`);
    }
  }
  return admin.firestore();
}

// Export a single function to get the database instance
export { getDb };
