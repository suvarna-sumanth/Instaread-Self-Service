'use server';
/**
 * @fileOverview This file is no longer used for sending emails.
 * The email logic has been consolidated into the API route at
 * /api/installs/confirm to resolve a Next.js build issue.
 * This file is kept to prevent breaking potential imports, but is not actively used.
 */

export type InstallNotificationArgs = {
    publication: string;
    websiteUrl: string;
    installedAt: string;
    dashboardUrl: string;
};

/**
 * This is now a no-op function.
 * The email sending logic has been moved directly into the API route that uses it.
 */
export async function sendInstallNotificationEmail(args: InstallNotificationArgs): Promise<void> {
    console.warn("DEPRECATED: sendInstallNotificationEmail is a no-op. The email logic has been moved to the API route at /api/installs/confirm.");
    return Promise.resolve();
}
