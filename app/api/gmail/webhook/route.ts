import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import axios from 'axios';
import dbConnect from '@/lib/db';
import GmailAccount from '@/models/GmailAccount';
import Master from '@/models/Master';
import ForwardingActivity from '@/models/ForwardingActivity';
import { refreshGmailToken } from '@/lib/refreshGmailToken';

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

async function processMessage(gmail: any, messageId: string, account: any) {
    try {
        const msg = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
            format: 'full',
        });

        const headers = msg.data.payload?.headers || [];
        const from = headers.find((h: any) => h.name === 'From')?.value || '';
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';

        // Skip forwarded emails to prevent loops
        if (subject.toLowerCase().startsWith('fwd:')) {
            console.log('Skipping already forwarded email');
            return;
        }

        let body = '';
        if (msg.data.payload?.body?.data) {
            body = Buffer.from(msg.data.payload.body.data, 'base64').toString();
        } else if (msg.data.payload?.parts) {
            for (const part of msg.data.payload.parts) {
                if (part.mimeType === 'text/plain' && part.body?.data) {
                    body = Buffer.from(part.body.data, 'base64').toString();
                    break;
                }
            }
        }

        console.log(`Processing: ${subject} from ${from}`);

        // Get all masters (forwarding rules)
        const masters = await Master.find({ isTelegramForwarding: { $ne: true } });

        for (const master of masters) {
            if (!master.autoForwardTo) continue;

            let match = false;

            // Check sender
            if (master.emailSender && from.toLowerCase().includes(master.emailSender.toLowerCase())) {
                match = true;
            }

            // Check keywords
            if (!match && master.emailKeywords && master.emailKeywords.length > 0) {
                const searchContent = `${subject} ${body}`.toLowerCase();
                if (master.emailKeywords.some((k: string) => searchContent.includes(k.toLowerCase()))) {
                    match = true;
                }
            }

            if (match) {
                // Check for duplicates
                const existing = await ForwardingActivity.findOne({
                    emailId: messageId,
                    masterId: master._id.toString(),
                });

                if (existing) {
                    console.log('Already processed, skipping');
                    continue;
                }

                // Forward the email
                try {
                    await forwardEmail(gmail, messageId, master.autoForwardTo, subject);

                    await ForwardingActivity.create({
                        emailId: messageId,
                        gmailAccountId: account._id.toString(),
                        emailFrom: from,
                        emailSubject: subject,
                        forwardedTo: master.autoForwardTo,
                        masterId: master._id.toString(),
                        status: 'success',
                    });

                    console.log(`✅ Forwarded to ${master.autoForwardTo}`);
                } catch (error: any) {
                    console.error(`Failed to forward:`, error);

                    await ForwardingActivity.create({
                        emailId: messageId,
                        gmailAccountId: account._id.toString(),
                        emailFrom: from,
                        emailSubject: subject,
                        forwardedTo: master.autoForwardTo,
                        masterId: master._id.toString(),
                        status: 'failed',
                        errorMessage: error.message,
                    });
                }

                break; // Only forward once per email
            }
        }
    } catch (error) {
        console.error(`Failed to process message ${messageId}:`, error);
    }
}

async function forwardEmail(gmail: any, messageId: string, to: string, subject: string) {
    // Get full message to extract body content
    const msg = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
    });

    // Extract body content
    let body = '';
    if (msg.data.payload?.body?.data) {
        body = Buffer.from(msg.data.payload.body.data, 'base64').toString();
    } else if (msg.data.payload?.parts) {
        for (const part of msg.data.payload.parts) {
            if (part.mimeType === 'text/plain' && part.body?.data) {
                body = Buffer.from(part.body.data, 'base64').toString();
                break;
            } else if (part.mimeType === 'text/html' && part.body?.data && !body) {
                body = Buffer.from(part.body.data, 'base64').toString();
            }
        }
    }

    const headers = msg.data.payload?.headers || [];
    const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown';
    const date = headers.find((h: any) => h.name === 'Date')?.value || '';

    // Create forwarded email with original content
    const emailContent = [
        `To: ${to}`,
        `Subject: Fwd: ${subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset="UTF-8"',
        '',
        '---------- Forwarded message ----------',
        `From: ${from}`,
        `Date: ${date}`,
        `Subject: ${subject}`,
        '',
        body || '(No message body)',
    ].join('\n');

    const encodedEmail = Buffer.from(emailContent)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
            raw: encodedEmail,
        },
    });
}
