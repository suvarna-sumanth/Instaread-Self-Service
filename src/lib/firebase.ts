
import admin from 'firebase-admin';

let db: admin.firestore.Firestore | undefined;

try {
  if (admin.apps.length) {
    db = admin.firestore();
  } else {
    // The Firebase SDK expects the service account keys to be in snake_case.
    const serviceAccount = {
        project_id: process.env.FIREBASE_PROJECT_ID,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        // The private key needs to be parsed correctly to handle escaped newlines.
        private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    };
    
    // Directly attempt initialization and let the Firebase SDK handle validation.
    // If any credential is missing or malformed, this will throw a specific error.
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    db = admin.firestore();
  }
} catch (error) {
    console.error('Firebase admin initialization error:', error);
    // Re-throw the original error from the SDK to provide full context.
    throw error;
}

export { db };
