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
        const { text, photo, document, from } = body;

        await dbConnect();

        // Get the "Telegram Forwarding" master
        const telegramMaster = await Master.findOne({
            name: 'Telegram Forwarding',
            isTelegramForwarding: true
        });

        if (!telegramMaster || !telegramMaster.autoForwardTo) {
            return NextResponse.json({
                error: 'Telegram forwarding not configured',
                message: 'Please configure Telegram forwarding in settings'
            }, { status: 400 });
        }

        // Get primary Gmail account (first active one)
        const gmailAccount = await GmailAccount.findOne({ isActive: true });
        if (!gmailAccount) {
            return NextResponse.json({
                error: 'No Gmail account connected'
            }, { status: 400 });
        }

        // Refresh token if needed
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

        // Prepare email content
        let emailBody = `Forwarded from Telegram\nFrom: ${from?.first_name || 'Unknown'} ${from?.last_name || ''}\n\n`;
        if (text) {
            emailBody += `Message:\n${text}`;
        }

        // Create email with attachment if present
        let rawEmail;
        if (photo || document) {
            // Download attachment from Telegram
            const fileId = photo ? photo[photo.length - 1].file_id : document.file_id;
            const fileName = document ? document.file_name : `image_${Date.now()}.jpg`;

            const fileUrl = await getTelegramFileUrl(fileId);
            const fileData = await downloadTelegramFile(fileUrl);

            rawEmail = createEmailWithAttachment(
                telegramMaster.autoForwardTo,
                'Telegram Forwarding',
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

        // Send email
        await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: rawEmail,
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Forwarded to email successfully'
        });
    } catch (error: any) {
        console.error('Telegram forward error:', error);
        return NextResponse.json({
            error: 'Failed to forward',
            details: error.message
        }, { status: 500 });
    }
}

async function getTelegramFileUrl(fileId: string): Promise<string> {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const res = await axios.get(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
    const filePath = res.data.result.file_path;
    return `https://api.telegram.org/file/bot${botToken}/${filePath}`;
}

async function downloadTelegramFile(url: string): Promise<Buffer> {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
}

function createSimpleEmail(to: string, subject: string, body: string): string {
    const email = [
        'Content-Type: text/plain; charset="UTF-8"',
        'MIME-Version: 1.0',
        'Content-Transfer-Encoding: 7bit',
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
