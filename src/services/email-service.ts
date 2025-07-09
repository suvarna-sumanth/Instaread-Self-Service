
'use server';

/**
 * @fileOverview An abstracted service for sending emails.
 * This service is designed to be provider-agnostic. To switch email providers,
 * you would only need to modify the logic within this file.
 */

import { Resend } from 'resend';
import { PartnerInstallNotificationEmail } from '../components/emails/partner-install-notification-email';

// For now, we are using Resend directly. In the future, this could be
// a factory function that returns a different provider implementation
// based on an environment variable (e.g., process.env.EMAIL_PROVIDER).
const getEmailProvider = () => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        throw new Error('Resend API key is missing. Please set RESEND_API_KEY in your environment variables.');
    }
    return new Resend(apiKey);
};

type InstallNotificationArgs = {
    publication: string;
    websiteUrl: string;
    installedAt: string;
    dashboardUrl: string;
}

export async function sendInstallNotificationEmail({
    publication,
    websiteUrl,
    installedAt,
    dashboardUrl
}: InstallNotificationArgs) {
    const resend = getEmailProvider();
    
    const from = process.env.EMAIL_FROM;
    const to = process.env.EMAIL_TO;

    if (!from || !to) {
        throw new Error('Email sender (EMAIL_FROM) or recipient (EMAIL_TO) is not configured in environment variables.');
    }

    const toList = to.split(',').map(email => email.trim());

    try {
        await resend.emails.send({
            from: from,
            to: toList,
            subject: `🎉 New Installation: ${publication} has installed the Instaread Player!`,
            react: PartnerInstallNotificationEmail({
                publication,
                websiteUrl,
                installedAt,
                dashboardUrl,
            }),
        });
    } catch (error) {
        console.error("[Email Service Error]", error);
        throw new Error('Failed to send email.');
    }
}
