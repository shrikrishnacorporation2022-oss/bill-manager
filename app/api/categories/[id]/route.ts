import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import Category from '@/models/Category';

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
        await Category.findOneAndDelete({
            _id: params.id,
            userId: session.user.email,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
    }
}
