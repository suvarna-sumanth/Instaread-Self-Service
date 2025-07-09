
'use server';
/**
 * @fileOverview A service for managing demo configurations in the database.
 * This is the only file that should directly interact with the database.
 * To switch to a different database (e.g., PostgreSQL), only this file needs to be modified.
 */

import { getDb } from '@/lib/firebase';
import type { DemoConfig } from '@/types';
import { FieldValue } from 'firebase-admin/firestore';


/**
 * Creates or updates a demo configuration in the database based on the websiteUrl.
 * @param demoData - The configuration data for the demo.
 * @returns The unique ID of the created or updated demo.
 */
export async function upsertDemo(demoData: Omit<DemoConfig, 'id' | 'createdAt' | 'updatedAt' | 'viewCount'>): Promise<string> {
  const db = getDb();
  try {
    const demosRef = db.collection('demos');
    const q = demosRef.where('websiteUrl', '==', demoData.websiteUrl).limit(1);
    const snapshot = await q.get();

    const now = new Date().toISOString();

    if (!snapshot.empty) {
      // Document exists, update it
      const docId = snapshot.docs[0].id;
      await demosRef.doc(docId).update({
        ...demoData,
        updatedAt: now,
      });
      return docId;
    } else {
      // Document does not exist, create it
      const docRef = await demosRef.add({
        ...demoData,
        createdAt: now,
        updatedAt: now,
        viewCount: 0,
      });
      return docRef.id;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred.";
    console.error("Error upserting demo in Firestore: ", message);
    throw new Error(`Failed to save demo configuration: ${message}`);
  }
}

/**
 * Retrieves a demo configuration by its ID and increments its view count.
 * @param id - The unique ID of the demo.
 * @returns The demo configuration object, or null if not found.
 */
export async function getDemoById(id: string): Promise<DemoConfig | null> {
  const db = getDb();
  try {
    const docRef = db.collection('demos').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return null;
    }

    // Asynchronously increment the view count without waiting for it to complete.
    // This prevents blocking the page render.
    docRef.update({ viewCount: FieldValue.increment(1) }).catch(err => {
        console.error(`Failed to increment view count for demo ${id}:`, err);
    });

    return { id: doc.id, ...doc.data() } as DemoConfig;
  } catch (error) {
    console.error(`Error fetching demo ${id} from Firestore: `, error);
    throw new Error("Failed to retrieve demo configuration.");
  }
}

/**
 * Retrieves all demo configurations from the database, ordered by last update time.
 * @returns An array of demo configuration objects.
 */
export async function getAllDemos(): Promise<DemoConfig[]> {
  const db = getDb();
  try {
    const snapshot = await db.collection('demos').orderBy('updatedAt', 'desc').get();
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DemoConfig));
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred.";
    console.error("Error fetching all demos from Firestore: ", message);
    throw new Error(`Failed to retrieve demo configurations: ${message}`);
  }
}

/**
 * Deletes a demo configuration by its ID.
 * @param id - The unique ID of the demo to delete.
 */
export async function deleteDemo(id: string): Promise<void> {
    const db = getDb();
    try {
        await db.collection('demos').doc(id).delete();
    } catch (error) {
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        console.error(`Error deleting demo ${id} from Firestore: `, message);
        throw new Error(`Failed to delete demo: ${message}`);
    }
}
