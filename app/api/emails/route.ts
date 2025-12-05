import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import dbConnect from '@/lib/db';
import GmailAccount from '@/models/GmailAccount';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const accountId = searchParams.get('accountId');

        if (!accountId) {
            return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
        }

        await dbConnect();
        const account = await GmailAccount.findById(accountId);

        if (!account) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 });
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );

        oauth2Client.setCredentials({
            access_token: account.accessToken,
            refresh_token: account.refreshToken,
        });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        const res = await gmail.users.messages.list({
            userId: 'me',
            maxResults: 20,
            q: '',
        });

        const messages = res.data.messages || [];
        const emailDetails = [];

        for (const message of messages.slice(0, 20)) {
            const msg = await gmail.users.messages.get({
                userId: 'me',
                id: message.id!,
                format: 'metadata',
                metadataHeaders: ['From', 'Subject', 'Date'],
            });

            const headers = msg.data.payload?.headers;
            const from = headers?.find(h => h.name === 'From')?.value || '';
            const subject = headers?.find(h => h.name === 'Subject')?.value || '';
            const date = headers?.find(h => h.name === 'Date')?.value || '';

            emailDetails.push({
                id: message.id,
                from,
                subject,
                date,
            });
        }

        return NextResponse.json(emailDetails);
    } catch (error: any) {
        console.error('=== EMAIL API ERROR ===');
        console.error('Error message:', error.message);
        return NextResponse.json({
            error: 'Failed to fetch emails',
            details: error.message
        }, { status: 500 });
    }
}
