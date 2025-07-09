
import admin from 'firebase-admin';

let db: admin.firestore.Firestore | undefined;

try {
  if (admin.apps.length) {
    db = admin.firestore();
  } else {
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountString) {
      throw new Error('Firebase service account JSON is not set in environment variables. Please set FIREBASE_SERVICE_ACCOUNT_JSON.');
    }

    try {
        const serviceAccount = JSON.parse(serviceAccountString);

        // The private key from the environment variable has escaped newlines (\\n).
        // We need to replace them with actual newline characters (\n) for the SDK.
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        db = admin.firestore();
    } catch (e) {
        // This will catch errors from JSON.parse or from initializeApp
        const message = e instanceof Error ? e.message : 'An unknown error occurred during Firebase initialization.';
        console.error("Firebase Initialization Error:", message);
        throw new Error(`Failed to parse or initialize Firebase Admin SDK: ${message}`);
    }
  }
} catch (error) {
    // This catches the high-level error from the logic above
    console.error('Firebase admin setup failed:', error);
    // Re-throw the original error to provide full context to the caller.
    throw error;
}

export { db };
