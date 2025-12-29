import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import GmailAccount from '@/models/GmailAccount';
import Master from '@/models/Master';

export async function GET() {
    try {
        await dbConnect();

        const telegramMaster = await Master.findOne({
            isTelegramForwarding: true
        });

        const gmailAccount = await GmailAccount.findOne({ isActive: true });

        return NextResponse.json({
            telegramConfigured: !!telegramMaster,
            forwardToEmail: telegramMaster?.autoForwardTo || null,
            gmailAccountConnected: !!gmailAccount,
            gmailEmail: gmailAccount?.email || null,
            readyToForward: !!(telegramMaster && telegramMaster.autoForwardTo && gmailAccount)
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
