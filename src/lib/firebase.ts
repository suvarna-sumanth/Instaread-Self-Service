
import admin from 'firebase-admin';

let db: admin.firestore.Firestore | undefined;

try {
  if (admin.apps.length) {
    db = admin.firestore();
  } else {
    const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // The private key needs to be parsed correctly.
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    };
    
    if (serviceAccount.projectId && serviceAccount.clientEmail && serviceAccount.privateKey) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        db = admin.firestore();
    } else {
        console.warn('Firebase credentials are not set in environment variables. Database-dependent features will be unavailable.');
    }
  }
} catch (error) {
    console.error('Firebase admin initialization error:', error);
}

export { db };
