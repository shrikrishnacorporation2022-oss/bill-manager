import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import GmailAccount from '@/models/GmailAccount';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const accounts = await GmailAccount.find({
            userId: session.user.email,
            isActive: true
        });

        return NextResponse.json(accounts.map(acc => ({
            id: acc._id,
            email: acc.email,
            createdAt: acc.createdAt,
        })));
    } catch (error) {
        console.error('Failed to fetch Gmail accounts:', error);
        return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
    }
}
