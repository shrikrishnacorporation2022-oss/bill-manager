import { google } from 'googleapis';
import Master from '@/models/Master';
import Bill from '@/models/Bill';
import dbConnect from './db';

const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
);

oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

export async function checkEmails() {
    await dbConnect();
    const masters = await Master.find({});

    // 1. Build a search query based on all master keywords
    // This is a simplified approach. Ideally, we search for unread emails generally.
    const res = await gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread', // Only check unread emails
        maxResults: 10,
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
        const body = msg.data.snippet || ''; // Simplified body access

        console.log(`Checking email: ${subject} from ${from}`);

        // 2. Match against Masters
        for (const master of masters) {
            const isSenderMatch = master.emailSender && from.includes(master.emailSender);
            const isKeywordMatch = master.emailKeywords?.some(k =>
                subject.toLowerCase().includes(k.toLowerCase()) ||
                body.toLowerCase().includes(k.toLowerCase())
            );

            if (isSenderMatch || isKeywordMatch) {
                console.log(`Match found for ${master.name}`);

                // 3. Create Bill Entry (Simplified logic - assumes bill is found)
                // In a real app, we'd use LLM or Regex to extract amount/date
                await Bill.create({
                    masterId: master._id,
                    amount: 0, // Placeholder, needs extraction logic
                    billDate: new Date(),
                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
                    status: 'Pending',
                    description: `Imported from email: ${subject}`,
                });

                // 4. Forward Email if configured
                if (master.autoForwardTo) {
                    await forwardEmail(message.id!, master.autoForwardTo);
                }

                // 5. Mark as read
                await gmail.users.messages.modify({
                    userId: 'me',
                    id: message.id!,
                    requestBody: {
                        removeLabelIds: ['UNREAD'],
                    },
                });
            }
        }
    }
}

async function forwardEmail(messageId: string, to: string) {
    // Gmail API doesn't have a direct "forward" method, we have to send a new message
    // This is complex because we need to fetch the raw content and re-encode it.
    // For now, we'll send a notification email instead.

    const raw = makeBody(to, 'me', 'Forwarded Bill', 'Please check the attached bill.');
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
