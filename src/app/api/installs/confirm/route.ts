'use server';

import { NextResponse } from 'next/server';
import { recordInstall } from '@/services/demo-service';
import nodemailer from 'nodemailer';
import { renderToStaticMarkup } from 'react-dom/server';
import { PartnerInstallNotificationEmail } from '@/components/emails/partner-install-notification-email';

// Common headers for CORS to allow cross-origin requests
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

type InstallNotificationArgs = {
    publication: string;
    websiteUrl: string;
    installedAt: string;
    dashboardUrl: string;
};

/**
 * Renders and sends the installation notification email.
 * This logic is co-located in the API route to prevent Next.js build issues
 * with server-only packages like 'react-dom/server'.
 */
async function sendInstallNotification(args: InstallNotificationArgs) {
    const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM, EMAIL_TO } = process.env;

    if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASS || !EMAIL_FROM || !EMAIL_TO) {
        throw new Error('Email provider credentials are not fully configured in environment variables.');
    }

    const transporter = nodemailer.createTransport({
        host: EMAIL_HOST,
        port: parseInt(EMAIL_PORT, 10),
        secure: parseInt(EMAIL_PORT, 10) === 465,
        auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });

    const emailHtml = renderToStaticMarkup(PartnerInstallNotificationEmail(args));
    const toList = EMAIL_TO.split(',').map(email => email.trim());

    const info = await transporter.sendMail({
        from: EMAIL_FROM,
        to: toList.join(', '),
        subject: `🎉 New Installation: ${args.publication} has installed the Instaread Player!`,
        html: emailHtml,
    });
    console.log(`[API /api/installs/confirm] Email sent successfully! Message ID: ${info.messageId}`);
}


// Handler for the browser's preflight OPTIONS request.
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204, // No Content
        headers: corsHeaders,
    });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { publication } = body;

        if (!publication) {
            return NextResponse.json({ message: 'Publication name is required.' }, { status: 400, headers: corsHeaders });
        }

        const result = await recordInstall(publication);
        
        if (result.success) {
            // After successfully updating the database, send an email notification.
            try {
                const appUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://your-production-app-url.com';
                
                await sendInstallNotification({
                    publication: result.demo.publication,
                    websiteUrl: result.demo.websiteUrl,
                    installedAt: result.installedAt,
                    dashboardUrl: `${appUrl}/dashboard`
                });

            } catch (emailError) {
                // IMPORTANT: Log the email error but do not throw it or fail the request.
                // The primary function (recording the install) succeeded, and we don't
                // want an email failure to break the core functionality.
                console.error(`[API /api/installs/confirm] Failed to send email notification for "${publication}":`, emailError);
            }

            // Add CORS headers to the success response
            return NextResponse.json({ message: 'Installation event processed.' }, { status: 200, headers: corsHeaders });
        } else {
            // Add CORS headers to the 'not found' response
            return NextResponse.json({ message: 'Publication not found.' }, { status: 404, headers: corsHeaders });
        }

    } catch (error) {
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        console.error('[API /api/installs/confirm] Error:', message);
        // Add CORS headers to the internal server error response
        return NextResponse.json({ message: `Internal Server Error: ${message}` }, { status: 500, headers: corsHeaders });
    }
}
