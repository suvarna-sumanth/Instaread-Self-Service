
import { NextResponse } from 'next/server';
import { recordInstall } from '@/services/demo-service';

// Common headers for CORS to allow cross-origin requests
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

// Handler for the browser's preflight OPTIONS request.
// This is required for CORS to work with POST requests that have a JSON body.
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
            // Respond with the CORS headers even for errors
            return NextResponse.json({ message: 'Publication name is required.' }, { status: 400, headers: corsHeaders });
        }

        const success = await recordInstall(publication);
        
        if (success) {
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
