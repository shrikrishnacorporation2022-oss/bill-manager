import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import dbConnect from '@/lib/db';
import GmailAccount from '@/models/GmailAccount';
import { refreshGmailToken } from '@/lib/refreshGmailToken';

export async function POST(request: Request) {
    try {
        const { topicName } = await request.json();

        if (!topicName) {
            return NextResponse.json({ error: 'Topic name required' }, { status: 400 });
        }

        await dbConnect();
        const accounts = await GmailAccount.find({ isActive: true });
        const results = [];

        for (const account of accounts) {
            try {
                const credentials = await refreshGmailToken(account._id.toString());

                const oauth2Client = new google.auth.OAuth2(
                    process.env.GOOGLE_CLIENT_ID,
                    process.env.GOOGLE_CLIENT_SECRET
                );

                oauth2Client.setCredentials({
                    access_token: credentials.accessToken,
                    refresh_token: credentials.refreshToken,
                });

                const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

                const res = await gmail.users.watch({
                    userId: 'me',
                    requestBody: {
                        topicName: topicName,
                        labelIds: ['INBOX'],
                    },
                });

                // Update expiration and initial historyId
                account.watchExpiration = new Date(Number(res.data.expiration));
                if (res.data.historyId) {
                    account.historyId = res.data.historyId;
                }
                await account.save();

                results.push({
                    email: account.email,
                    status: 'success',
                    expiration: res.data.expiration,
                    historyId: res.data.historyId
                });
            } catch (error: any) {
                console.error(`Failed to watch for ${account.email}:`, error);
                results.push({
                    email: account.email,
                    status: 'failed',
                    error: error.message
                });
            }
        }

        return NextResponse.json({ results });
    } catch (error: any) {
        console.error('Watch Renewal Error:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error.message
        }, { status: 500 });
    }
}
