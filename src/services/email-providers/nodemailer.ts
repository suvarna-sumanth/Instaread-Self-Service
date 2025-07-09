
'use server';

/**
 * @fileOverview Nodemailer-specific implementation for sending emails.
 */

import nodemailer from 'nodemailer';
import type { InstallNotificationArgs } from '../email-service';


// This function creates and configures a Nodemailer "transporter" which is
// the object responsible for the actual sending of the email.
const getTransporter = () => {
    const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;

    if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASS) {
        throw new Error('Nodemailer provider credentials are not configured in environment variables.');
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


/**
 * Sends an email using the Nodemailer provider.
 * @param args The arguments required for the email's metadata (to, from, subject).
 * @param htmlBody The pre-rendered HTML content of the email.
 */
export async function sendWithNodemailer(
    args: InstallNotificationArgs,
    htmlBody: string
) {
    const transporter = getTransporter();
    
    const from = process.env.EMAIL_FROM;
    const to = process.env.EMAIL_TO;

    if (!from || !to) {
        throw new Error('Email sender (EMAIL_FROM) or recipient (EMAIL_TO) is not configured in environment variables.');
    }

    const toList = to.split(',').map(email => email.trim());

    try {
        const info = await transporter.sendMail({
            from: from,
            to: toList.join(', '), // Nodemailer can take a comma-separated string
            subject: `🎉 New Installation: ${args.publication} has installed the Instaread Player!`,
            html: htmlBody,
        });

        console.log(`[Nodemailer Provider] Email sent successfully! Message ID: ${info.messageId}`);
    } catch (error) {
        console.error("[Nodemailer Provider Error]", error);
        // We throw the error so the calling function can handle it.
        throw new Error('Failed to send email via Nodemailer.');
    }
}
