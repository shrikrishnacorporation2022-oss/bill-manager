async function forwardEmail(gmail: any, messageId: string, to: string, subject: string) {
    // Get full message to extract body
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
        body || '(No message content)',
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
