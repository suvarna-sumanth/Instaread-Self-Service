
'use server';
/**
 * @fileOverview A service for managing demo configurations in the database.
 * This is the only file that should directly interact with the database.
 * To switch to a different database (e.g., PostgreSQL), only this file needs to be modified.
 */

import { getDb } from '@/lib/firebase';
import type { DemoConfig } from '@/types';

/**
 * Creates a new demo configuration in the database.
 * @param demoData - The configuration data for the demo.
 * @returns The unique ID of the newly created demo.
 */
export async function createDemo(demoData: Omit<DemoConfig, 'id'>): Promise<string> {
  const db = getDb();
  try {
    const docRef = await db.collection('demos').add({
        ...demoData,
        createdAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred.";
    console.error("Error creating demo in Firestore: ", message);
    throw new Error(`Failed to save demo configuration: ${message}`);
  }
}

/**
 * Retrieves a demo configuration by its ID.
 * @param id - The unique ID of the demo.
 * @returns The demo configuration object, or null if not found.
 */
export async function getDemoById(id: string): Promise<DemoConfig | null> {
  const db = getDb();
  try {
    const doc = await db.collection('demos').doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() } as DemoConfig;
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred.";
    console.error(`Error fetching demo ${id} from Firestore: `, message);
    throw new Error(`Failed to retrieve demo configuration: ${message}`);
  }
}

/**
 * Retrieves all demo configurations from the database.
 * @returns An array of all demo configurations.
 */
export async function getAllDemos(): Promise<DemoConfig[]> {
    const db = getDb();
    try {
        const snapshot = await db.collection('demos').orderBy('createdAt', 'desc').get();
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
