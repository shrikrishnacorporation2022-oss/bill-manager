import Master from '@/models/Master';
import ForwardingActivity from '@/models/ForwardingActivity';

async function forwardEmailRaw(gmail: any, messageId: string, to: string, subject: string) {
    // Get the raw email message
    const msg = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'raw',
    });

    // Decode the raw message
    const rawEmail = Buffer.from(msg.data.raw, 'base64url').toString('utf-8');

    // Parse headers and body
    const headerEndIndex = rawEmail.indexOf('\r\n\r\n');
    const originalHeaders = rawEmail.substring(0, headerEndIndex);
    const body = rawEmail.substring(headerEndIndex + 4);

    // Create new headers for forwarded email
    const forwardedHeaders = [
        `To: ${to}`,
        `Subject: Fwd: ${subject}`,
        // Copy important MIME headers from original
        ...originalHeaders.split('\r\n').filter((line: string) => {
            return (line.startsWith('MIME-Version:') ||
                line.startsWith('Content-Type:') ||
                line.startsWith('Content-Transfer-Encoding:'));
        }),
    ].join('\r\n');

    // Reconstruct the email with new headers and original body
    const forwardedEmail = `${forwardedHeaders}\r\n\r\n${body}`;

    // Encode and send
    const encodedEmail = Buffer.from(forwardedEmail)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
            raw: encodedEmail,
        },
    });

    console.log(`✅ Forwarded raw email to ${to}`);
}

export async function processMessage(gmail: any, messageId: string, account: any) {
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

        // Extract body content - handle nested parts for emails with attachments
        let body = '';

        const extractBody = (parts: any[]): void => {
            for (const part of parts) {
                if (part.mimeType === 'text/plain' && part.body?.data && !body) {
                    body = Buffer.from(part.body.data, 'base64').toString();
                    break;
                } else if (part.mimeType === 'text/html' && part.body?.data && !body) {
                    body = Buffer.from(part.body.data, 'base64').toString();
                } else if (part.parts) {
                    // Recursively check nested parts
                    extractBody(part.parts);
                }
            }
        };

        if (msg.data.payload?.body?.data) {
            body = Buffer.from(msg.data.payload.body.data, 'base64').toString();
        } else if (msg.data.payload?.parts) {
            extractBody(msg.data.payload.parts);
        }

        console.log(`Processing: ${subject} from ${from} (body length: ${body.length})`);

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
                    await forwardEmailRaw(gmail, messageId, master.autoForwardTo, subject);

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
