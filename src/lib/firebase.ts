
import admin from 'firebase-admin';

// This is a lazy-loaded, singleton instance of the Firebase Admin SDK.
// It ensures that we only initialize the app once, and that it's only
// done when the database is first accessed. This is the recommended
// pattern for using Firebase with serverless functions like Next.js
// Server Actions.

let db: admin.firestore.Firestore;

function getDb(): admin.firestore.Firestore {
    if (db) {
        return db;
    }

    try {
        if (admin.apps.length > 0) {
            db = admin.firestore();
            return db;
        }

        const privateKey = process.env.FIREBASE_PRIVATE_KEY;
        if (!privateKey) {
            throw new Error('FIREBASE_PRIVATE_KEY is not set in environment variables.');
        }

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                // The private key must have newlines replaced to be valid.
                privateKey: privateKey.replace(/\\n/g, '\n'),
            }),
        });

        db = admin.firestore();
        return db;
    } catch (error) {
        let message = 'Firebase admin initialization error.';
        if (error instanceof Error) {
            message = `${message} ${error.message}`;
        }
        console.error(message);
        // We throw a new error to ensure the cause is clear to the consumer of this function.
        throw new Error('Failed to initialize Firebase Admin SDK. Check server logs for details.');
    }
}

export { getDb };
