import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import Master from '@/models/Master';

export async function PUT(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await context.params;
        const body = await request.json();

        await dbConnect();

        const master = await Master.findByIdAndUpdate(
            id,
            {
                ...body,
                userId: session.user.email,
            },
            { new: true }
        );

        if (!master) {
            return NextResponse.json({ error: 'Master not found' }, { status: 404 });
        }

        return NextResponse.json(master);
    } catch (error: any) {
        console.error('Failed to update master:', error);
        return NextResponse.json({
            error: 'Failed to update master',
            details: error.message
        }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await context.params;

        await dbConnect();
        await Master.findByIdAndDelete(id);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Failed to delete master:', error);
        return NextResponse.json({
            error: 'Failed to delete master',
            details: error.message
        }, { status: 500 });
    }
}
