import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import dbConnect from '@/lib/db';
import GmailAccount from '@/models/GmailAccount';
import Master from '@/models/Master';
import Bill from '@/models/Bill';
import ForwardingActivity from '@/models/ForwardingActivity';
import { sendTelegramMessage } from '@/lib/telegram';
import { refreshGmailToken } from '@/lib/refreshGmailToken';

export async function GET(request: Request) {
    // Verify Cron Secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        await dbConnect();

        // 1. Get all active Gmail accounts
        const gmailAccounts = await GmailAccount.find({ isActive: true });
        let totalProcessed = 0;
        let totalForwarded = 0;

        for (const account of gmailAccounts) {
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

            // 2. Get all masters for forwarding rules
            const masters = await Master.find({ userId: account.userId });

            // 3. Fetch recent emails (last 2 hours) instead of just unread
            const res = await gmail.users.messages.list({
                userId: 'me',
                q: 'newer_than:2h',
                maxResults: 50,
            });

            const messages = res.data.messages || [];

            for (const message of messages) {
                const msg = await gmail.users.messages.get({
                    userId: 'me',
                    id: message.id!,
                    format: 'full',
                });

                const headers = msg.data.payload?.headers;
                const subject = headers?.find(h => h.name === 'Subject')?.value || '';
                const from = headers?.find(h => h.name === 'From')?.value || '';
                const body = msg.data.snippet || '';

                console.log(`[${account.email}] Checking: ${subject} from ${from}`);

                // 4. Match against forwarding rules
                for (const master of masters) {
                    // Skip if no forwarding configured
                    if (!master.autoForwardTo) continue;

                    const isSenderMatch = master.emailSender && from.includes(master.emailSender);
                    const isKeywordMatch = master.emailKeywords?.some(k =>
                        subject.toLowerCase().includes(k.toLowerCase()) ||
                        body.toLowerCase().includes(k.toLowerCase())
                    );

                    if (isSenderMatch || isKeywordMatch) {
                        console.log(`✓ Match found for ${master.name}`);

                        // 5. Check if already processed (avoid duplicates)
                        const existingActivity = await ForwardingActivity.findOne({
                            emailId: message.id!,
                            masterId: master._id.toString(),
                        });

                        if (existingActivity) {
                            console.log(`⏭️  Already processed, skipping`);
                            continue; // Skip this rule for this email
                        }

                        // 6. Forward email
                        try {
                            await forwardEmail(gmail, message.id!, master.autoForwardTo, subject);
                            console.log(`✓ Forwarded to ${master.autoForwardTo}`);

                            // 7. Save forwarding activity
                            await ForwardingActivity.create({
                                emailId: message.id!,
                                gmailAccountId: account._id.toString(),
                                emailFrom: from,
                                emailSubject: subject,
                                forwardedTo: master.autoForwardTo,
                                masterId: master._id.toString(),
                                status: 'success',
                            });

                            totalForwarded++;
                        } catch (error: any) {
                            console.error(`✗ Failed to forward:`, error.message);

                            // Save failed forwarding activity
                            await ForwardingActivity.create({
                                emailId: message.id!,
                                gmailAccountId: account._id.toString(),
                                emailFrom: from,
                                emailSubject: subject,
                                forwardedTo: master.autoForwardTo,
                                masterId: master._id.toString(),
                                status: 'failed',
                                errorMessage: error.message,
                            });
                        }

                        // NOTE: We do NOT mark as read - emails stay unread for user visibility
                        totalProcessed++;
                        break; // Stop checking other masters for this email
                    }
                }
            }
        }

        // 8. Check for due bills and send Telegram reminders
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

        const dueBills = await Bill.find({
            status: 'Pending',
            dueDate: {
                $gte: new Date(),
                $lte: threeDaysFromNow
            }
        }).populate('masterId');

        for (const bill of dueBills) {
            const master = bill.masterId as any;
            if (master && master.whatsappReminder) {
                const chatId = process.env.TELEGRAM_CHAT_ID;
                if (chatId) {
                    await sendTelegramMessage(
                        chatId,
                        `*Reminder:* Your ${master.name} bill of ₹${bill.amount} is due on ${bill.dueDate.toDateString()}.`
                    );
                }
            }
        }

        return NextResponse.json({
            success: true,
            emailsChecked: totalProcessed,
            emailsForwarded: totalForwarded,
            reminders: dueBills.length
        });
    } catch (error) {
        console.error('Cron job failed:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

async function forwardEmail(gmail: any, messageId: string, to: string, subject: string) {
    const raw = makeBody(to, 'me', `Fwd: ${subject}`, 'Please see the forwarded email.');
    await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
            raw: raw,
        },
    });
}

function makeBody(to: string, from: string, subject: string, message: string) {
    const str = [
        "Content-Type: text/plain; charset=\"UTF-8\"\n",
        "MIME-Version: 1.0\n",
        "Content-Transfer-Encoding: 7bit\n",
        "to: ", to, "\n",
        "from: ", from, "\n",
        "subject: ", subject, "\n\n",
        message
    ].join('');

    return Buffer.from(str).toString("base64").replace(/\+/g, '-').replace(/\//g, '_');
}
