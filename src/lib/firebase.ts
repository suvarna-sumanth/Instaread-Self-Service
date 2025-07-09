
import admin from 'firebase-admin';

let db: admin.firestore.Firestore | undefined;

try {
  if (admin.apps.length) {
    db = admin.firestore();
  } else {
    const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // The private key needs to be parsed correctly to handle escaped newlines.
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    };
    
    if (serviceAccount.projectId && serviceAccount.clientEmail && serviceAccount.privateKey) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        db = admin.firestore();
    } else {
        const missing = [
            !serviceAccount.projectId && "FIREBASE_PROJECT_ID",
            !serviceAccount.clientEmail && "FIREBASE_CLIENT_EMAIL",
            !serviceAccount.privateKey && "FIREBASE_PRIVATE_KEY"
        ].filter(Boolean).join(', ');
        // Throw a more specific error about which credentials are missing.
        throw new Error(`Firebase credentials are not fully set in environment variables. Missing or invalid: ${missing}. Please check your .env file.`);
    }
  }
} catch (error) {
    console.error('Firebase admin initialization error:', error);
    // Re-throw the original error to provide full context and stop execution.
    // This prevents the generic error message from appearing later.
    throw error;
}

export { db };
