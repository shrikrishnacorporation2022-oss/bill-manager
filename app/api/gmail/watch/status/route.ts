import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import GmailAccount from '@/models/GmailAccount';

export async function GET() {
    try {
        await dbConnect();

        const accounts = await GmailAccount.find({ isActive: true });

        const statuses = accounts.map(account => {
            const now = new Date();
            const isExpired = account.watchExpiration ? account.watchExpiration < now : true;

            return {
                email: account.email,
                isActive: !isExpired,
                expiresAt: account.watchExpiration,
                lastRenewed: account.updatedAt,
            };
        });

        return NextResponse.json({ accounts: statuses });
    } catch (error: any) {
        console.error('Failed to get watch status:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
