import { google } from 'googleapis';
import GmailAccount from '@/models/GmailAccount';
import dbConnect from '@/lib/db';

export async function refreshGmailToken(accountId: string) {
    await dbConnect();

    const account = await GmailAccount.findById(accountId);
    if (!account) {
        throw new Error('Gmail account not found');
    }

    // Check if token is expired or expiring soon (within 5 minutes)
    const now = new Date();
    const expiresAt = new Date(account.expiresAt);
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAt > fiveMinutesFromNow) {
        // Token is still valid
        return {
            accessToken: account.accessToken,
            refreshToken: account.refreshToken,
            expiresAt: account.expiresAt,
        };
    }

    // Token is expired or expiring soon, refresh it
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
        refresh_token: account.refreshToken,
    });

    try {
        // Request new access token
        const { credentials } = await oauth2Client.refreshAccessToken();

        // Update database with new tokens
        account.accessToken = credentials.access_token!;
        if (credentials.expiry_date) {
            account.expiresAt = new Date(credentials.expiry_date);
        }
        await account.save();

        console.log(`✓ Refreshed token for ${account.email}`);

        return {
            accessToken: credentials.access_token!,
            refreshToken: account.refreshToken,
            expiresAt: account.expiresAt,
        };
    } catch (error: any) {
        console.error(`✗ Failed to refresh token for ${account.email}:`, error.message);
        throw new Error('Failed to refresh OAuth token');
    }
}
