import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Bill from '@/models/Bill';

export async function GET() {
    try {
        await dbConnect();
        const bills = await Bill.find({}).populate('masterId');
        return NextResponse.json(bills);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch bills' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        await dbConnect();
        const body = await request.json();
        const bill = await Bill.create(body);
        return NextResponse.json(bill, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create bill' }, { status: 500 });
    }
}
