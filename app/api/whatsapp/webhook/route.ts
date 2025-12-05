import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

// Verify Webhook (GET)
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        return new NextResponse(challenge, { status: 200 });
    }
    return new NextResponse('Forbidden', { status: 403 });
}

// Handle Incoming Messages (POST)
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Check if it's a WhatsApp status update
        if (body.entry?.[0]?.changes?.[0]?.value?.statuses) {
            return NextResponse.json({ status: 'ok' });
        }

        const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

        if (message) {
            const from = message.from; // Sender's phone number
            const type = message.type;

            if (type === 'text') {
                const text = message.text.body;
                console.log(`Received text from ${from}: ${text}`);

                // Simple echo/logic
                if (text.toLowerCase().includes('bill')) {
                    await sendWhatsAppMessage(from, 'Please upload the bill PDF or image.');
                } else {
                    await sendWhatsAppMessage(from, `You said: ${text}`);
                }
            } else if (type === 'image' || type === 'document') {
                console.log(`Received media from ${from}`);
                // Here we would download the media using the ID
                // const mediaId = message[type].id;
                await sendWhatsAppMessage(from, 'Received your document! Processing...');
            }
        }

        return NextResponse.json({ status: 'ok' });
    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
