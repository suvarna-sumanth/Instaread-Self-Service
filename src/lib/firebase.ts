
import admin from 'firebase-admin';

let db: admin.firestore.Firestore;

// This logic runs once when the module is first imported.
if (admin.apps.length) {
  // If already initialized, use the existing instance
  db = admin.firestore();
} else {
  // Initialize for the first time
  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!serviceAccountString) {
    // This is a critical failure. The app cannot run without this config.
    const errorMessage = 'Firebase configuration is missing. The FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set.';
    console.error('!!! FATAL: FIREBASE INITIALIZATION FAILED !!!');
    console.error(errorMessage);
    throw new Error(errorMessage);
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
  } catch (error) {
    const originalMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error('!!! FATAL: FIREBASE INITIALIZATION FAILED !!!');
    console.error(`There was a problem initializing Firebase, likely due to a malformed FIREBASE_SERVICE_ACCOUNT_JSON value. Please verify it is a valid, quoted JSON string.`);
    console.error('Original Error:', originalMessage);
    // Re-throw the original error to give the most detail to the Next.js error overlay.
    throw error;
  }
}

export { db };
