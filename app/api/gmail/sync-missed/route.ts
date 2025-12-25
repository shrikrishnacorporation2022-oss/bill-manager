import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import dbConnect from '@/lib/db';
import GmailAccount from '@/models/GmailAccount';
import { refreshGmailToken } from '@/lib/refreshGmailToken';
import { calculateBackfillPeriod, fetchMissedEmails } from '@/lib/backfillEmails';
import { processMessage } from '@/lib/processEmailMessage';

export async function POST(request: Request) {
    try {
        const { accountId } = await request.json();

        if (!accountId) {
            return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
        }

        await dbConnect();
        const account = await GmailAccount.findById(accountId);

        if (!account) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 });
        }

        // 1. Refresh token
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

        // 2. Perform backfill
        const backfillPeriod = await calculateBackfillPeriod(account.lastSuccessfulCheck, { maxDays: 30 });
        const missedMessages = await fetchMissedEmails(gmail, backfillPeriod.fromDate, backfillPeriod.toDate);

        let count = 0;
        for (const message of missedMessages) {
            await processMessage(gmail, message.id, account);
            count++;
        }

        // 3. Update last successful check
        account.lastSuccessfulCheck = new Date();
        await account.save();

        return NextResponse.json({
            success: true,
            count,
            message: `Successfully synced ${count} missed emails`
        });

    } catch (error: any) {
        console.error('Manual sync failed:', error);
        return NextResponse.json({ error: error.message || 'Sync failed' }, { status: 500 });
    }
}
