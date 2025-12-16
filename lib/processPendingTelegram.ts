import { google } from 'googleapis';
import axios from 'axios';

export async function processPendingTelegramMessage(
    gmail: any,
    pending: any,
    autoForwardTo: string
) {
    try {
        let emailBody = `From Telegram (Queued on ${pending.receivedAt.toLocaleString()}):\n\n${pending.text || ''}`;

        let rawEmail;

        if (pending.photoFileId || pending.documentFileId) {
            const fileId = pending.photoFileId || pending.documentFileId;
            const fileName = pending.documentFileId ? 'document.pdf' : `image_${Date.now()}.jpg`;

            // Download file from Telegram
            const token = process.env.TELEGRAM_BOT_TOKEN;
            const fileRes = await axios.get(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
            const fileUrl = `https://api.telegram.org/file/bot${token}/${fileRes.data.result.file_path}`;
            const fileData = await axios.get(fileUrl, { responseType: 'arraybuffer' });

            rawEmail = createEmailWithAttachment(
                autoForwardTo,
                'Telegram Message (Queued)',
                emailBody,
                fileName,
                Buffer.from(fileData.data)
            );
        } else {
            rawEmail = createSimpleEmail(
                autoForwardTo,
                'Telegram Message (Queued)',
                emailBody
            );
        }

        await gmail.users.messages.send({
            userId: 'me',
            requestBody: { raw: rawEmail },
        });

        pending.processed = true;
        pending.processedAt = new Date();
        await pending.save();

        console.log(`✅ Processed pending Telegram message ${pending._id}`);
        return true;

    } catch (error: any) {
        console.error(`Failed to process pending message:`, error.message);
        pending.error = error.message;
        await pending.save();
        return false;
    }
}

function createSimpleEmail(to: string, subject: string, body: string): string {
    const email = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        '',
        body
    ].join('\r\n');

    return Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function createEmailWithAttachment(
    to: string,
    subject: string,
    body: string,
    fileName: string,
    fileData: Buffer
): string {
    const boundary = '----=_Part_' + Date.now();

    const email = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset=UTF-8',
        '',
        body,
        '',
        `--${boundary}`,
        `Content-Type: application/octet-stream; name="${fileName}"`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${fileName}"`,
        '',
        fileData.toString('base64'),
        `--${boundary}--`
    ].join('\r\n');

    return Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}
