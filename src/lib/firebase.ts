
import admin from 'firebase-admin';

let db: admin.firestore.Firestore;

// This logic runs once when the module is first imported.
if (admin.apps.length) {
  // If already initialized, use the existing instance
  db = admin.firestore();
} else {
  // Initialize for the first time
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    const errorMessage = 'Firebase credentials (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) are not fully set in environment variables.';
    console.error('!!! FATAL: FIREBASE INITIALIZATION FAILED !!!');
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        // The private key from the environment variable must have its escaped newlines
        // replaced with actual newline characters to be valid.
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });

    db = admin.firestore();
  } catch (error) {
    const originalMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error('!!! FATAL: FIREBASE INITIALIZATION FAILED !!!');
    console.error('The Admin SDK could not be initialized. This is often due to a malformed credential, especially the private key.');
    console.error('Original Error:', originalMessage);
    // Re-throw the original error to give the most detail to the Next.js error overlay.
    throw error;
  }
}

export { db };
