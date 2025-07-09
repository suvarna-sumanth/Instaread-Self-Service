
'use server';
/**
 * @fileOverview A service for managing demo configurations in the database.
 * This is the only file that should directly interact with the database.
 * To switch to a different database (e.g., PostgreSQL), only this file needs to be modified.
 */

import { db } from '@/lib/firebase';
import type { DemoConfig } from '@/types';


const checkDb = () => {
    if (!db) {
        throw new Error('Firebase is not initialized. Please ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set correctly in your environment variables.');
    }
}

/**
 * Creates a new demo configuration in the database.
 * @param demoData - The configuration data for the demo.
 * @returns The unique ID of the newly created demo.
 */
export async function createDemo(demoData: Omit<DemoConfig, 'id'>): Promise<string> {
  checkDb();
  try {
    const docRef = await db.collection('demos').add({
        ...demoData,
        createdAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating demo in Firestore: ", error);
    throw new Error("Failed to save demo configuration.");
  }
}

/**
 * Retrieves a demo configuration by its ID.
 * @param id - The unique ID of the demo.
 * @returns The demo configuration object, or null if not found.
 */
export async function getDemoById(id: string): Promise<DemoConfig | null> {
  checkDb();
  try {
    const doc = await db.collection('demos').doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() } as DemoConfig;
  } catch (error) {
    console.error(`Error fetching demo ${id} from Firestore: `, error);
    throw new Error("Failed to retrieve demo configuration.");
  }
}

/**
 * Retrieves all demo configurations from the database.
 * @returns An array of all demo configurations.
 */
export async function getAllDemos(): Promise<DemoConfig[]> {
    checkDb();
    try {
        const snapshot = await db.collection('demos').orderBy('createdAt', 'desc').get();
        if (snapshot.empty) {
            return [];
        }
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DemoConfig));
    } catch (error) {
        console.error("Error fetching all demos from Firestore: ", error);
        throw new Error("Failed to retrieve demo configurations.");
    }
}
