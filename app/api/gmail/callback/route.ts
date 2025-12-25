import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import dbConnect from '@/lib/db';
import GmailAccount from '@/models/GmailAccount';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');
        const state = searchParams.get('state'); // User email

        if (!code || !state) {
            return NextResponse.redirect(new URL('/emails?error=missing_params', request.url));
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            `${process.env.NEXTAUTH_URL}/api/gmail/callback`
        );

        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Get user's Gmail email
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        const profile = await gmail.users.getProfile({ userId: 'me' });
        const gmailEmail = profile.data.emailAddress;

        // Save to database
        await dbConnect();
        const account = await GmailAccount.findOneAndUpdate(
            { userId: state, email: gmailEmail },
            {
                userId: state,
                email: gmailEmail,
                accessToken: tokens.access_token!,
                refreshToken: tokens.refresh_token!,
                expiresAt: new Date(tokens.expiry_date!),
                isActive: true,
            },
            { upsert: true, new: true }
        );

        // Immediate Backfill Trigger: catch up on missed emails from the last disconnection
        // We do this asynchronously to avoid timing out the redirect
        (async () => {
            try {
                const { calculateBackfillPeriod, fetchMissedEmails } = await import('@/lib/backfillEmails');
                const { processMessage } = await import('@/lib/processEmailMessage');

                const backfillPeriod = await calculateBackfillPeriod(account.lastSuccessfulCheck, { maxDays: 7 });
                const missedMessages = await fetchMissedEmails(gmail, backfillPeriod.fromDate, backfillPeriod.toDate);

                for (const message of missedMessages) {
                    await processMessage(gmail, message.id, account);
                }

                account.lastSuccessfulCheck = new Date();
                await account.save();
                console.log(`✅ Immediate backfill completed for ${gmailEmail}`);
            } catch (err) {
                console.error(`Immediate backfill failed for ${gmailEmail}:`, err);
            }
        })();

        return NextResponse.redirect(new URL('/emails?success=true', request.url));
    } catch (error) {
        console.error('OAuth callback error:', error);
        return NextResponse.redirect(new URL('/emails?error=oauth_failed', request.url));
    }
}
