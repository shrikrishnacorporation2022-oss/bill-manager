import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import Master from '@/models/Master';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        // Get or create Telegram forwarding master
        let telegramMaster = await Master.findOne({
            userId: session.user.email,
            isTelegramForwarding: true,
        });

        if (!telegramMaster) {
            // Create default Telegram forwarding master
            telegramMaster = await Master.create({
                name: 'Telegram Forwarding',
                category: 'Other',
                userId: session.user.email,
                isTelegramForwarding: true,
                whatsappReminder: false,
            });
        }

        return NextResponse.json({
            autoForwardTo: telegramMaster.autoForwardTo || '',
        });
    } catch (error: any) {
        console.error('Failed to fetch Telegram settings:', error);
        return NextResponse.json({
            error: 'Failed to fetch settings',
            details: error.message
        }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { autoForwardTo } = await request.json();

        if (!autoForwardTo) {
            return NextResponse.json({ error: 'Email required' }, { status: 400 });
        }

        await dbConnect();

        // Update or create Telegram forwarding master
        const telegramMaster = await Master.findOneAndUpdate(
            {
                userId: session.user.email,
                isTelegramForwarding: true,
            },
            {
                name: 'Telegram Forwarding',
                category: 'Other',
                userId: session.user.email,
                isTelegramForwarding: true,
                autoForwardTo: autoForwardTo,
                whatsappReminder: false,
            },
            { upsert: true, new: true }
        );

        return NextResponse.json({
            success: true,
            autoForwardTo: telegramMaster.autoForwardTo
        });
    } catch (error: any) {
        console.error('Failed to save Telegram settings:', error);
        return NextResponse.json({
            error: 'Failed to save settings',
            details: error.message
        }, { status: 500 });
    }
}
