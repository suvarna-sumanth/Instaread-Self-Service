'use server';
/**
 * @fileOverview Email service factory.
 * This service acts as a dispatcher to send emails using the configured provider.
 * It uses dynamic imports to load providers only when needed, which is crucial
 * for avoiding Next.js build errors with server-only packages.
 */

export type InstallNotificationArgs = {
    publication: string;
    websiteUrl: string;
    installedAt: string;
    dashboardUrl: string;
};

export async function sendInstallNotificationEmail(args: InstallNotificationArgs): Promise<void> {
    const providerName = process.env.EMAIL_PROVIDER || 'nodemailer';
    
    try {
        switch (providerName) {
            case 'nodemailer':
                // Dynamically import the provider to break the static analysis chain
                const { sendInstallNotification } = await import('./email-providers/nodemailer');
                await sendInstallNotification(args);
                break;
            // Future providers like 'resend' could be added here
            // case 'resend':
            //     const resendProvider = await import('./email-providers/resend');
            //     await resendProvider.sendInstallNotification(args);
            //     break;
            default:
                throw new Error(`Unsupported email provider: ${providerName}`);
        }
    } catch (error) {
        console.error(`[Email Service] Failed to send email using provider "${providerName}":`, error);
        // Re-throw the error to be handled by the caller (API route)
        throw error;
    }
}
