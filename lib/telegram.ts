import axios from 'axios';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function sendTelegramMessage(chatId: string, text: string) {
    if (!TELEGRAM_BOT_TOKEN) {
        console.error('TELEGRAM_BOT_TOKEN is missing');
        return;
    }

    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown',
        });
    } catch (error) {
        console.error('Failed to send Telegram message', error);
    }
}

export async function setTelegramWebhook(url: string) {
    if (!TELEGRAM_BOT_TOKEN) return;
    try {
        await axios.get(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${url}`);
        console.log('Telegram webhook set to', url);
    } catch (error) {
        console.error('Failed to set Telegram webhook', error);
    }
}
