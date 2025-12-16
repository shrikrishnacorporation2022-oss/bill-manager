import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import axios from 'axios';
import dbConnect from '@/lib/db';
import GmailAccount from '@/models/GmailAccount';
import Master from '@/models/Master';
import ForwardingActivity from '@/models/ForwardingActivity';
import { refreshGmailToken } from '@/lib/refreshGmailToken';
import { processMessage } from '@/lib/processEmailMessage';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        console.log('=== GMAIL WEBHOOK RECEIVED ===');
        console.log('Body:', JSON.stringify(body, null, 2));

        // Save to debug logs
        try {
            await axios.post(`${process.env.NEXTAUTH_URL}/api/debug/logs`, {
                type: 'email',
                message: 'Gmail Push Notification Received',
                data: body,
            });
        } catch (e) {
            console.error('Failed to log:', e);
        }

        const message = body.message;
        if (!message || !message.data) {
            console.log('No message data');
            return NextResponse.json({ ok: true });
        }

        // Decode Pub/Sub message
        const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
        const { emailAddress, historyId } = data;

        console.log(`Push notification for ${emailAddress}, historyId: ${historyId}`);

        await dbConnect();

        // Find the account
        const account = await GmailAccount.findOne({ email: emailAddress });
        if (!account) {
            console.log('Account not found');
            return NextResponse.json({ ok: true });
        }

        // Refresh token if needed
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

        // Fetch new messages using history API
        const startHistoryId = account.historyId || historyId;

        try {
            const historyRes = await gmail.users.history.list({
                userId: 'me',
                startHistoryId: startHistoryId,
                historyTypes: ['messageAdded'],
            });

            const history = historyRes.data.history || [];
            const newMessageIds = new Set<string>();

            for (const record of history) {
                if (record.messagesAdded) {
                    for (const msg of record.messagesAdded) {
                        if (msg.message?.id) {
                            newMessageIds.add(msg.message.id);
                        }
                    }
                }
            }

            console.log(`Found ${newMessageIds.size} new messages`);

            // Process each message
            for (const messageId of Array.from(newMessageIds)) {
                await processMessage(gmail, messageId, account);
            }

            // Update historyId
            account.historyId = historyId;
            await account.save();

        } catch (error: any) {
            if (error.code === 404) {
                console.log('History too old, resetting historyId');
                account.historyId = historyId;
                await account.save();
            } else {
                throw error;
            }
        }

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        console.error('Gmail Webhook Error:', error);
        return NextResponse.json({ ok: true });
    }
}
