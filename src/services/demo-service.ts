
'use server';
/**
 * @fileOverview A service for managing demo configurations in the database.
 * This is the only file that should directly interact with the database.
 * To switch to a different database (e.g., PostgreSQL), only this file needs to be modified.
 */

import { getDb } from '@/lib/firebase';
import type { DemoConfig } from '@/types';


/**
 * Creates or updates a demo configuration in the database based on the websiteUrl.
 * @param demoData - The configuration data for the demo.
 * @returns The unique ID of the created or updated demo.
 */
export async function upsertDemo(demoData: Omit<DemoConfig, 'id' | 'createdAt' | 'updatedAt' | 'isInstalled' | 'installedAt'>): Promise<string> {
  const db = getDb();
  try {
    const demosRef = db.collection('demos');
    // We use websiteUrl as the unique key to find existing demos
    const q = demosRef.where('websiteUrl', '==', demoData.websiteUrl).limit(1);
    const snapshot = await q.get();

    const now = new Date().toISOString();

    if (!snapshot.empty) {
      // Document exists, update it. We preserve the original install status.
      const docId = snapshot.docs[0].id;
      const existingData = snapshot.docs[0].data();
      await demosRef.doc(docId).update({
        ...demoData,
        updatedAt: now,
        // Preserve install status if it exists
        isInstalled: existingData.isInstalled || false,
        installedAt: existingData.installedAt || null,
      });
      return docId;
    } else {
      // Document does not exist, create it with default installation status.
      const docRef = await demosRef.add({
        ...demoData,
        isInstalled: false,
        installedAt: null,
        createdAt: now,
        updatedAt: now,
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
 * Retrieves a demo configuration by its ID.
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
export async function deleteDemo(id: string): Promise<DemoConfig | null> {
    const db = getDb();
    try {
        const docRef = db.collection('demos').doc(id);
        const doc = await docRef.get();
        if (!doc.exists) return null;
        const data = { id: doc.id, ...doc.data() } as DemoConfig;
        await docRef.delete();
        return data;
    } catch (error) {
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        console.error(`Error deleting demo ${id} from Firestore: `, message);
        throw new Error(`Failed to delete demo: ${message}`);
    }
}

type RecordInstallResult = 
    | { success: true, demo: DemoConfig, installedAt: string }
    | { success: false }

/**
 * Records an installation event for a given publication.
 * Finds the corresponding demo and updates its status to installed.
 * This function is idempotent and will not re-update a demo that is already marked as installed.
 * @param publication - The unique publication name of the partner.
 * @returns A result object indicating success and containing demo data for the caller.
 */
export async function recordInstall(publication: string): Promise<RecordInstallResult> {
  const db = getDb();
  try {
    if (!publication) {
        console.warn(`[recordInstall] Received install ping with no publication name.`);
        return { success: false };
    }

    const demosRef = db.collection('demos');
    const q = demosRef.where('publication', '==', publication).limit(1);
    const snapshot = await q.get();

    if (snapshot.empty) {
      console.warn(`[recordInstall] Received install ping for unknown publication: "${publication}". No record found.`);
      return { success: false };
    }

    const demoDoc = snapshot.docs[0];
    const demoData = { id: demoDoc.id, ...demoDoc.data() } as DemoConfig;
    
    // Only update if it's the first time being installed. This makes the endpoint idempotent.
    if (demoData.isInstalled) {
        console.log(`[recordInstall] Received duplicate install ping for publication: "${publication}". No update needed.`);
        return { success: true, demo: demoData, installedAt: demoData.installedAt! };
    }

    const installedAt = new Date().toISOString();
    await demosRef.doc(demoDoc.id).update({
      isInstalled: true,
      installedAt: installedAt,
    });

    console.log(`[recordInstall] Successfully recorded installation for publication: "${publication}".`);
    
    const updatedDemoData = { ...demoData, isInstalled: true, installedAt };
    return { success: true, demo: updatedDemoData, installedAt };

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred.";
    console.error(`[recordInstall] Error recording install for publication "${publication}": `, message);
    // We throw here to be explicit about failure, but the API route will catch it.
    throw new Error(`Failed to record installation: ${message}`);
  }
}


/**
 * Resets the installation status of a demo.
 * @param id The ID of the demo to reset.
 */
export async function resetDemoStatus(id: string): Promise<void> {
    const db = getDb();
    try {
        const docRef = db.collection('demos').doc(id);
        await docRef.update({
            isInstalled: false,
            installedAt: null,
            updatedAt: new Date().toISOString(),
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        console.error(`Error resetting demo status for ${id} in Firestore: `, message);
        throw new Error(`Failed to reset demo status: ${message}`);
    }
}
