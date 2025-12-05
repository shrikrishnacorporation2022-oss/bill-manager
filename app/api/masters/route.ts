import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Master from '@/models/Master';

export async function GET() {
    try {
        await dbConnect();
        const masters = await Master.find({});
        return NextResponse.json(masters);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch masters' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        await dbConnect();
        const body = await request.json();
        const master = await Master.create(body);
        return NextResponse.json(master, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create master' }, { status: 500 });
    }
}
