'use server';
/**
 * @fileOverview A self-contained utility for rendering and sending the partner installation email.
 * This file is dynamically imported by the API route to avoid Next.js build issues
 * with server-only packages like 'react-dom/server' and 'nodemailer'.
 */

import nodemailer from 'nodemailer';
import { renderToStaticMarkup } from 'react-dom/server';
import { PartnerInstallNotificationEmail } from '@/components/emails/partner-install-notification-email';

type InstallNotificationArgs = {
    publication: string;
    websiteUrl: string;
    installedAt: string;
    dashboardUrl: string;
};

// This function creates and configures a Nodemailer "transporter"
const getTransporter = () => {
    const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;

    if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASS) {
        throw new Error('Nodemailer provider credentials are not configured in environment variables.');
    }

    return nodemailer.createTransport({
        host: EMAIL_HOST,
        port: parseInt(EMAIL_PORT, 10),
        secure: parseInt(EMAIL_PORT, 10) === 465,
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS,
        },
    });
};

/**
 * Renders the email template and sends it using Nodemailer.
 * @param args The arguments for the email template.
 */
export async function sendPartnerInstallNotification(args: InstallNotificationArgs) {
    const from = process.env.EMAIL_FROM;
    const to = process.env.EMAIL_TO;

    if (!from || !to) {
        throw new Error('Email sender (EMAIL_FROM) or recipient (EMAIL_TO) is not configured in environment variables.');
    }
    
    // 1. Render the React component to an HTML string
    const emailHtml = renderToStaticMarkup(
        PartnerInstallNotificationEmail(args)
    );

    const transporter = getTransporter();
    const toList = to.split(',').map(email => email.trim());

    try {
        // 2. Send the email
        const info = await transporter.sendMail({
            from: from,
            to: toList.join(', '),
            subject: `🎉 New Installation: ${args.publication} has installed the Instaread Player!`,
            html: emailHtml,
        });

        console.log(`[Email Utility] Email sent successfully! Message ID: ${info.messageId}`);
    } catch (error) {
        console.error("[Email Utility Error]", error);
        // We throw the error so the calling function can handle it.
        throw new Error('Failed to send email via Nodemailer.');
    }
}
