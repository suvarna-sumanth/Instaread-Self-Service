
'use server';

/**
 * @fileOverview Nodemailer provider for sending emails.
 * This is the only file that should import 'react-dom/server'.
 */

import nodemailer from 'nodemailer';
import { renderToStaticMarkup } from 'react-dom/server';
import { PartnerInstallNotificationEmail } from '@/components/emails/partner-install-notification-email';
import type { InstallNotificationArgs } from '../email-service';


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


export async function sendInstallNotification(args: InstallNotificationArgs) {
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

        console.log(`[Nodemailer Provider] Email sent successfully! Message ID: ${info.messageId}`);
    } catch (error) {
        console.error("[Nodemailer Provider Error]", error);
        // We throw the error so the calling function can handle it.
        throw new Error('Failed to send email via Nodemailer.');
    }
}
