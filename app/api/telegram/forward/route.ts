import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import axios from 'axios';
import dbConnect from '@/lib/db';
import GmailAccount from '@/models/GmailAccount';

const text = message.text;
const photo = message.photo;
const document = message.document;
const from = message.from;

console.log('Message text:', text);
console.log('From:', from);

await dbConnect();

// Get the "Telegram Forwarding" master
const telegramMaster = await Master.findOne({
    isTelegramForwarding: true
});

console.log('Telegram master found:', telegramMaster ? 'Yes' : 'No');
console.log('Forward to email:', telegramMaster?.autoForwardTo);

if (!telegramMaster || !telegramMaster.autoForwardTo) {
    console.log('❌ Telegram forwarding not configured');
    return NextResponse.json({ ok: true }); // Still return 200 to Telegram
}

// Get primary Gmail account (first active one)
const gmailAccount = await GmailAccount.findOne({ isActive: true });
if (!gmailAccount) {
    console.log('❌ No Gmail account connected');
    return NextResponse.json({ ok: true });
}

console.log('Gmail account:', gmailAccount.email);

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
    const fileId = photo ? photo[photo.length - 1].file_id : document.file_id;
    const fileName = document ? document.file_name : `image_${Date.now()}.jpg`;

    console.log('Downloading attachment:', fileName);
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
console.log('Sending email to:', telegramMaster.autoForwardTo);
await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
        raw: rawEmail,
    },
});

console.log('✅ Email sent successfully!');

return NextResponse.json({
    ok: true,
    success: true,
    message: 'Forwarded to email successfully'
});
    } catch (error: any) {
    console.error('❌ Telegram forward error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json({
        ok: true // Still return 200 to Telegram
    });
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
