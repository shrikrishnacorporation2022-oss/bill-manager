import { google } from 'googleapis';

interface BackfillOptions {
    maxDays?: number; // Default 30
    maxEmails?: number; // Default 500
}

export async function calculateBackfillPeriod(lastSuccessfulCheck: Date | null | undefined, options: BackfillOptions = {}) {
    const maxDays = options.maxDays || 30;
    const now = new Date();

    if (!lastSuccessfulCheck) {
        // If never checked, backfill from 30 days ago
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - maxDays);
        return { fromDate, toDate: now };
    }

    const daysSinceCheck = Math.floor((now.getTime() - lastSuccessfulCheck.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceCheck > maxDays) {
        // Cap at max days
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - maxDays);
        return { fromDate, toDate: now };
    }

    return { fromDate: lastSuccessfulCheck, toDate: now };
}

export async function fetchMissedEmails(gmail: any, fromDate: Date, toDate: Date, maxEmails: number = 500) {
    const query = `after:${Math.floor(fromDate.getTime() / 1000)} before:${Math.floor(toDate.getTime() / 1000)}`;

    console.log(`📥 Fetching missed emails from ${fromDate.toISOString()} to ${toDate.toISOString()}`);

    try {
        const res = await gmail.users.messages.list({
            userId: 'me',
            q: query,
            maxResults: maxEmails,
        });

        const messages = res.data.messages || [];
        console.log(`Found ${messages.length} missed emails`);

        return messages;
    } catch (error: any) {
        console.error('Failed to fetch missed emails:', error.message);
        throw error;
    }
}

export async function processMissedEmails(
    gmail: any,
    messages: any[],
    account: any,
    processMessageFn: (gmail: any, messageId: string, account: any) => Promise<void>
) {
    let processed = 0;
    let failed = 0;

    for (const message of messages) {
        try {
            await processMessageFn(gmail, message.id, account);
            processed++;
        } catch (error: any) {
            console.error(`Failed to process message ${message.id}:`, error.message);
            failed++;
        }
    }

    console.log(`✅ Backfill complete: ${processed} processed, ${failed} failed`);

    return { processed, failed };
}
