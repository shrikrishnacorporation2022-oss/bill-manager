import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import axios from 'axios';
import dbConnect from '@/lib/db';
import GmailAccount from '@/models/GmailAccount';
import Master from '@/models/Master';
import { refreshGmailToken } from '@/lib/refreshGmailToken';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        console.log('=== TELEGRAM WEBHOOK RECEIVED ===');
        console.log('Full body:', JSON.stringify(body, null, 2));

        // Save to debug logs
        try {
            await axios.post(`${process.env.NEXTAUTH_URL}/api/debug/logs`, {
                type: 'telegram',
                message: `Received: ${body.message?.text || 'No text'}`,
                data: body.message,
            });
        } catch (e) {
            console.error('Failed to log:', e);
        }

        const message = body.message;
        if (!message) {
            return NextResponse.json({ ok: true });
        }

        const text = message.text;
        const photo = message.photo;
        const document = message.document;
        const from = message.from;

        await dbConnect();

        const telegramMaster = await Master.findOne({
            isTelegramForwarding: true
        });

        if (!telegramMaster || !telegramMaster.autoForwardTo) {
            console.log('❌ Not configured');
            return NextResponse.json({ ok: true });
        }

        const gmailAccount = await GmailAccount.findOne({ isActive: true });
        if (!gmailAccount) {
            return NextResponse.json({ ok: true });
        }

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

        let emailBody = `From Telegram: ${from?.first_name || 'Unknown'}\n\n${text || ''}`;

        let rawEmail;
        if (photo || document) {
            const fileId = photo ? photo[photo.length - 1].file_id : document.file_id;
            const fileName = document ? document.file_name : `image_${Date.now()}.jpg`;

            const fileUrl = await getTelegramFileUrl(fileId);
            const fileData = await downloadFile(fileUrl);

            rawEmail = createEmailWithAttachment(
                telegramMaster.autoForwardTo,
                'Telegram Message',
                emailBody,
                fileName,
                fileData
            );
        } else {
            rawEmail = createSimpleEmail(
                telegramMaster.autoForwardTo,
                'Telegram Message',
                emailBody
            );
        }

        await gmail.users.messages.send({
            userId: 'me',
            requestBody: { raw: rawEmail },
        });

        console.log('✅ Sent!');
        return NextResponse.json({ ok: true });
    } catch (error: any) {
        console.error('Error:', error);
        return NextResponse.json({ ok: true });
    }
}

async function getTelegramFileUrl(fileId: string): Promise<string> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const res = await axios.get(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
    return `https://api.telegram.org/file/bot${token}/${res.data.result.file_path}`;
}

async function downloadFile(url: string): Promise<Buffer> {
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(res.data);
}

function createSimpleEmail(to: string, subject: string, body: string): string {
    const email = [
        'Content-Type: text/plain; charset="UTF-8"',
        'MIME-Version: 1.0',
        `To: ${to}`,
        `Subject: ${subject}`,
        '',
        body
    ].join('\n');
    return Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
}

function createEmailWithAttachment(to: string, subject: string, body: string, fileName: string, fileData: Buffer): string {
    const boundary = '----boundary';
    const email = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset="UTF-8"',
        '',
        body,
        '',
        `--${boundary}`,
        'Content-Type: application/octet-stream',
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${fileName}"`,
        '',
        fileData.toString('base64'),
        `--${boundary}--`
    ].join('\n');
    return Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
}
