import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import Master from '@/models/Master';

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        await Master.findByIdAndDelete(params.id);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete master' }, { status: 500 });
    }
}
