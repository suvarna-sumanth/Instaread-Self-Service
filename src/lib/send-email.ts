
/**
 * @fileOverview A self-contained utility for rendering and sending the partner installation email.
 * This file is dynamically imported by the API route to avoid Next.js build issues.
 */

import nodemailer from 'nodemailer';
import { format } from 'date-fns';

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
 * Generates the HTML content for the notification email using a template string.
 * This avoids the need for react-dom/server.
 */
const generateEmailHtml = ({ publication, websiteUrl, installedAt, dashboardUrl }: InstallNotificationArgs): string => {
    const formattedDate = format(new Date(installedAt), "MMMM d, yyyy 'at' h:mm a");

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; }
        .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; }
        .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eee; }
        .content { padding: 20px 0; }
        .footer { text-align: center; font-size: 12px; color: #888; padding-top: 20px; border-top: 1px solid #eee; }
        .button { display: inline-block; padding: 12px 24px; margin-top: 20px; background-color: #29ABE2; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold; }
        .info-box { background-color: #f9f9f9; border: 1px solid #eee; border-radius: 5px; padding: 15px; margin-top: 20px; }
        .info-box p { margin: 0 0 5px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="color: #29ABE2; margin: 0;">🎉 New Player Installation</h1>
        </div>
        <div class="content">
          <p>Hello Team,</p>
          <p>
            Great news! A new partner has successfully installed the Instaread audio player on their website.
          </p>
          <div class="info-box">
            <p><strong>Partner:</strong> ${publication}</p>
            <p><strong>Website:</strong> <a href="${websiteUrl}" target="_blank" rel="noopener noreferrer" style="color: #29ABE2;">${websiteUrl}</a></p>
            <p><strong>Installation Date:</strong> ${formattedDate}</p>
          </div>
          <p>
            The partner's status has been automatically updated on the dashboard. You can view the details by clicking the button below.
          </p>
          <div style="text-align: center;">
              <a href="${dashboardUrl}" target="_blank" rel="noopener noreferrer" class="button" style="color: #fff;">
                  View Dashboard
              </a>
          </div>
        </div>
        <div class="footer">
          <p>This is an automated notification from the Instaread Demo Generator.</p>
        </div>
      </div>
    </body>
    </html>`;
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
    
    // 1. Generate the HTML string
    const emailHtml = generateEmailHtml(args);

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
