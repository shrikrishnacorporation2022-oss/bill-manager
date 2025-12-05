import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import ForwardingActivity from '@/models/ForwardingActivity';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        // Fetch latest 100 forwarding activities
        const activities = await ForwardingActivity.find()
            .sort({ forwardedAt: -1 })
            .limit(100)
            .populate('masterId', 'name')
            .lean();

        return NextResponse.json(activities);
    } catch (error: any) {
        console.error('Failed to fetch activities:', error);
        return NextResponse.json({
            error: 'Failed to fetch activities',
            details: error.message
        }, { status: 500 });
    }
}
