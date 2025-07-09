
import { NextResponse } from 'next/server';
import { recordInstall } from '@/services/demo-service';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { publication } = body;

        if (!publication) {
            return NextResponse.json({ message: 'Publication name is required.' }, { status: 400 });
        }

        // The recordInstall function returns a boolean and handles its own logging.
        const success = await recordInstall(publication);
        
        if (success) {
             // Return 200 OK whether it's a new install or a duplicate ping.
            return NextResponse.json({ message: 'Installation event processed.' }, { status: 200 });
        } else {
            // This case is unlikely if recordInstall throws errors, but acts as a fallback.
            // Typically means publication was not found.
            return NextResponse.json({ message: 'Publication not found.' }, { status: 404 });
        }

    } catch (error) {
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        console.error('[API /api/installs/confirm] Error:', message);
        // The service layer will throw an error for actual database issues.
        return NextResponse.json({ message: `Internal Server Error: ${message}` }, { status: 500 });
    }
}
