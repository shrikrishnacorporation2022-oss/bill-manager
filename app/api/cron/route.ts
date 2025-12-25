import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import dbConnect from '@/lib/db';
import GmailAccount from '@/models/GmailAccount';
import Master from '@/models/Master';
import Bill from '@/models/Bill';
import ForwardingActivity from '@/models/ForwardingActivity';
import PendingTelegramMessage from '@/models/PendingTelegramMessage';
import { sendTelegramMessage } from '@/lib/telegram';
import { refreshGmailToken } from '@/lib/refreshGmailToken';
import { checkOAuthHealth, sendOAuthAlert, attemptTokenRefresh } from '@/lib/oauthMonitor';
import { calculateBackfillPeriod, fetchMissedEmails } from '@/lib/backfillEmails';
import { processMessage } from '@/lib/processEmailMessage';

export async function GET(request: Request) {
    // Verify Cron Secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        await dbConnect();

        // 0. OAUTH HEALTH CHECK - Check all accounts for token issues
        console.log('=== OAuth Health Check ===');
        const gmailAccounts = await GmailAccount.find({ isActive: true });

        for (const account of gmailAccounts) {
            const health = await checkOAuthHealth(account);

            if (!health.isHealthy) {
                console.log(`⚠️  ${account.email} - OAuth unhealthy (${health.daysUntilExpiry} days left)`);

                // Try to refresh token
                const refreshed = await attemptTokenRefresh(account, refreshGmailToken);

                if (!refreshed) {
                    // Send Telegram alert
                    await sendOAuthAlert(account.email, health.error || 'Token expired');
                }
            }
        }

        // 1. BACKFILL MISSED EMAILS - Check for any accounts that were disconnected
        console.log('=== Backfill Check ===');
        let totalBackfilled = 0;

        for (const account of gmailAccounts) {
            try {
                const backfillPeriod = await calculateBackfillPeriod(account.lastSuccessfulCheck, { maxDays: 30 });
                const timeSinceCheckMs = backfillPeriod.toDate.getTime() - backfillPeriod.fromDate.getTime();

                // If we have missed any time (at least 5 minutes to avoid redundant work with webhooks)
                if (timeSinceCheckMs > 5 * 60 * 1000) {
                    console.log(`📥 Checking for missed emails since ${backfillPeriod.fromDate.toISOString()}`);

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

                    const missedMessages = await fetchMissedEmails(gmail, backfillPeriod.fromDate, backfillPeriod.toDate);

                    // Process missed emails
                    for (const message of missedMessages) {
                        await processMessage(gmail, message.id, account);
                        totalBackfilled++;
                    }

                    console.log(`✅ Backfilled ${missedMessages.length} emails for ${account.email}`);
                }

                // Update last successful check
                account.lastSuccessfulCheck = new Date();
                await account.save();

            } catch (error: any) {
                console.error(`Failed to backfill ${account.email}:`, error.message);
            }
        }

        // 2. PROCESS PENDING TELEGRAM MESSAGES
        console.log('=== Processing Pending Telegram Messages ===');
        const pendingMessages = await PendingTelegramMessage.find({ processed: false }).limit(100);
        let telegramProcessed = 0;

        if (pendingMessages.length > 0) {
            // Get Telegram master config
            const telegramMaster = await Master.findOne({ isTelegramForwarding: true });

            if (telegramMaster && telegramMaster.autoForwardTo) {
                // Get first active Gmail account
                const gmailAccount = gmailAccounts[0];

                if (gmailAccount) {
                    try {
                        const credentials = await refreshGmailToken(gmailAccount._id.toString());
                        const oauth2Client = new google.auth.OAuth2(
                            process.env.GOOGLE_CLIENT_ID,
                            process.env.GOOGLE_CLIENT_SECRET
                        );
                        oauth2Client.setCredentials({
                            access_token: credentials.accessToken,
                            refresh_token: credentials.refreshToken,
                        });
                        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

                        const { processPendingTelegramMessage } = await import('@/lib/processPendingTelegram');

                        for (const pending of pendingMessages) {
                            const success = await processPendingTelegramMessage(gmail, pending, telegramMaster.autoForwardTo);
                            if (success) telegramProcessed++;
                        }
                    } catch (error: any) {
                        console.error('Failed to process Telegram messages:', error.message);
                    }
                }
            }
        }

        // 3. Get all active Gmail accounts
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

        }

        // 8. Renew Gmail watch subscriptions (expires every 7 days)
        console.log('Renewing Gmail watch subscriptions...');
        for (const account of gmailAccounts) {
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
                        topicName: 'projects/bill-agent-480206/topics/gmail-push',
                        labelIds: ['INBOX'],
                    },
                });

                // Update expiration and historyId
                account.watchExpiration = new Date(Number(res.data.expiration));
                if (res.data.historyId) {
                    account.historyId = res.data.historyId;
                }
                await account.save();

                console.log(`✅ Renewed watch for ${account.email}, expires: ${account.watchExpiration}`);
            } catch (error: any) {
                console.error(`Failed to renew watch for ${account.email}:`, error.message);
            }
        }

        // 9. Check for due bills and send Telegram reminders
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
            emailsBackfilled: totalBackfilled,
            telegramMessagesProcessed: telegramProcessed,
            reminders: dueBills.length
        });
    } catch (error) {
        console.error('Cron job failed:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
