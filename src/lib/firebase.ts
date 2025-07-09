
import admin from 'firebase-admin';

let db: admin.firestore.Firestore | undefined;

try {
  if (admin.apps.length) {
    db = admin.firestore();
  } else {
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    
    if (serviceAccountString) {
        const serviceAccount = JSON.parse(serviceAccountString);
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
