import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import GmailAccount from '@/models/GmailAccount';

export async function GET() {
    let step = 'init';
    try {
        step = 'auth';
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        step = 'db_connect';
        await dbConnect();

        step = 'db_query';
        const accounts = await GmailAccount.find({
            userId: session.user.email,
            isActive: true
        });

        step = 'response_map';
        return NextResponse.json(accounts.map(acc => ({
            id: acc._id,
            email: acc.email,
            createdAt: acc.createdAt,
        })));
    } catch (error: any) {
        console.error(`=== API ERROR at step: ${step} ===`);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        return NextResponse.json({
            error: 'Internal Server Error',
            step: step,
            details: error.message
        }, { status: 500 });
    }
}
