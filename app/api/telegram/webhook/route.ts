import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';

// Handle Incoming Messages (POST)
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const message = body.message;

        if (message) {
            const chatId = message.chat.id;
            const text = message.text;
            const document = message.document;
            const photo = message.photo;

            console.log(`Received Telegram message from ${chatId}: ${text || 'media'}`);

            if (text) {
                if (text === '/start') {
                    await sendTelegramMessage(chatId, `Welcome to BillBot! 🤖\nYour Chat ID is: \`${chatId}\`\nPlease add this to your .env.local file as TELEGRAM_CHAT_ID.`);
                } else if (text.toLowerCase().includes('bill')) {
                    await sendTelegramMessage(chatId, 'Please upload the bill PDF or image.');
                } else {
                    await sendTelegramMessage(chatId, `You said: ${text}`);
                }
            } else if (document || photo) {
                await sendTelegramMessage(chatId, 'Received your document! Processing... (Not yet implemented)');
                // Here we would get the file_id and download it via getFile API
            }
        }

        return NextResponse.json({ status: 'ok' });
    } catch (error) {
        console.error('Telegram Webhook error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
