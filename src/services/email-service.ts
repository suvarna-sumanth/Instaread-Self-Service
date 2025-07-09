'use server';

/**
 * @fileOverview An abstracted service for sending emails.
 * This service uses a factory pattern to select the email provider based on
 * the EMAIL_PROVIDER environment variable.
 */

// The arguments required to send an installation notification email.
// This type is shared across all provider implementations.
export type InstallNotificationArgs = {
    publication: string;
    websiteUrl: string;
    installedAt: string;
    dashboardUrl: string;
};

/**
 * Sends an email using the configured provider.
 * @param args The arguments needed to construct the email metadata (e.g. subject line).
 * @param htmlBody The pre-rendered HTML string of the email.
 */
export async function sendInstallNotificationEmail(args: InstallNotificationArgs, htmlBody: string) {
    // Select the provider and send the email with the pre-rendered HTML.
    const provider = process.env.EMAIL_PROVIDER || 'nodemailer';

    console.log(`[Email Factory] Using email provider: ${provider}`);

    switch (provider.toLowerCase()) {
        case 'nodemailer': {
            const { sendWithNodemailer } = await import('./email-providers/nodemailer');
            return sendWithNodemailer(args, htmlBody);
        }
        
        // To add a new provider, you would add a new case here.
        // For example:
        // case 'resend':
        //     const { sendWithResend } = await import('./email-providers/resend');
        //     return sendWithResend(args, htmlBody);

        default:
            console.error(`[Email Factory] Unsupported email provider specified: "${provider}"`);
            throw new Error(`Unsupported email provider: ${provider}`);
    }
}
