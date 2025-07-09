'use server';

/**
 * @fileOverview An abstracted service for sending emails.
 * This service uses a factory pattern to select the email provider based on
 * the EMAIL_PROVIDER environment variable.
 */

import { renderInstallNotificationHtml } from '@/lib/email-renderer';
import { sendWithNodemailer } from './email-providers/nodemailer';

// The arguments required to send an installation notification email.
// This type is shared across all provider implementations.
export type InstallNotificationArgs = {
    publication: string;
    websiteUrl: string;
    installedAt: string;
    dashboardUrl: string;
};

/**
 * Renders an email template and sends it using the configured provider.
 * @param args The arguments needed to construct the email.
 */
export async function sendInstallNotificationEmail(args: InstallNotificationArgs) {
    // 1. Render the React component to an HTML string.
    const emailHtml = renderInstallNotificationHtml(args);

    // 2. Select the provider and send the email with the pre-rendered HTML.
    const provider = process.env.EMAIL_PROVIDER || 'nodemailer';

    console.log(`[Email Factory] Using email provider: ${provider}`);

    switch (provider.toLowerCase()) {
        case 'nodemailer': {
            return sendWithNodemailer(args, emailHtml);
        }
        
        // To add a new provider, you would add a new case here.
        // For example:
        // case 'resend':
        //     const { sendWithResend } = await import('./email-providers/resend');
        //     return sendWithResend(args, emailHtml);

        default:
            console.error(`[Email Factory] Unsupported email provider specified: "${provider}"`);
            throw new Error(`Unsupported email provider: ${provider}`);
    }
}
