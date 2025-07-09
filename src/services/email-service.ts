
'use server';

/**
 * @fileOverview An abstracted service for sending emails.
 * This service is designed to be provider-agnostic. To switch email providers,
 * you would only need to modify the logic within this file.
 */

import nodemailer from 'nodemailer';
import { renderToStaticMarkup } from 'react-dom/server';
import { PartnerInstallNotificationEmail } from '@/components/emails/partner-install-notification-email';

// This function creates and configures a Nodemailer "transporter" which is
// the object responsible for the actual sending of the email.
const getTransporter = () => {
    const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;

    if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASS) {
        throw new Error('Email provider credentials are not configured in environment variables.');
    }

    return nodemailer.createTransport({
        host: EMAIL_HOST,
        port: parseInt(EMAIL_PORT, 10),
        secure: parseInt(EMAIL_PORT, 10) === 465, // true for 465, false for other ports
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS,
        },
    });
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
    const transporter = getTransporter();
    
    const from = process.env.EMAIL_FROM;
    const to = process.env.EMAIL_TO;

    if (!from || !to) {
        throw new Error('Email sender (EMAIL_FROM) or recipient (EMAIL_TO) is not configured in environment variables.');
    }

    const toList = to.split(',').map(email => email.trim());

    // Render our React component to a static HTML string.
    const emailHtml = renderToStaticMarkup(
        PartnerInstallNotificationEmail({
            publication,
            websiteUrl,
            installedAt,
            dashboardUrl,
        })
    );

    try {
        await transporter.sendMail({
            from: from,
            to: toList.join(', '), // Nodemailer can take a comma-separated string
            subject: `🎉 New Installation: ${publication} has installed the Instaread Player!`,
            html: emailHtml,
        });
    } catch (error) {
        console.error("[Email Service Error]", error);
        throw new Error('Failed to send email.');
    }
}
