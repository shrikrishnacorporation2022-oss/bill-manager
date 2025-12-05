import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { google } from 'googleapis';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            `${process.env.NEXTAUTH_URL}/api/gmail/callback`
        );

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/gmail.modify'],
            prompt: 'consent',
            state: session.user.email, // Pass user email in state
        });

        return NextResponse.json({ authUrl });
    } catch (error) {
        console.error('Failed to generate auth URL:', error);
        return NextResponse.json({ error: 'Failed to initiate OAuth' }, { status: 500 });
    }
}
