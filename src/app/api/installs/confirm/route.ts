'use server';

import { NextResponse } from 'next/server';
import { recordInstall } from '@/services/demo-service';
import { updateDemoStatusInSheet } from '@/services/google-sheets-service';

// Common headers for CORS to allow cross-origin requests
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

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
                // Dynamically import the email utility to prevent Next.js build issues
                // with server-only packages like 'nodemailer' and 'react-dom/server'.
                const { sendPartnerInstallNotification } = await import('@/lib/send-email');
                
                const appUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://your-production-app-url.com';
                
                await sendPartnerInstallNotification({
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

            // Also update the Google Sheet.
            try {
                await updateDemoStatusInSheet(result.demo.id, result.installedAt);
            } catch (sheetError) {
                // Log the sheet error but do not fail the request.
                console.error(`[API /api/installs/confirm] Failed to update Google Sheet for demo "${result.demo.id}":`, sheetError);
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
