import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import mongoose from 'mongoose';

// Simple in-memory log storage (will reset on redeploy)
const logs: any[] = [];
const MAX_LOGS = 100;

interface DebugLog extends mongoose.Document {
    timestamp: Date;
    type: 'telegram' | 'email' | 'cron';
    message: string;
    data?: any;
}

const DebugLogSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    type: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed },
});

const DebugLog = mongoose.models.DebugLog || mongoose.model<DebugLog>('DebugLog', DebugLogSchema);

export async function GET() {
    try {
        await dbConnect();

        const logs = await DebugLog.find()
            .sort({ timestamp: -1 })
            .limit(50)
            .lean();

        return NextResponse.json(logs.map(log => ({
            timestamp: new Date(log.timestamp).toLocaleString('en-IN'),
            type: log.type,
            message: log.message,
            data: log.data,
        })));
    } catch (error: any) {
        console.error('Failed to fetch logs:', error);
        return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        await dbConnect();

        await DebugLog.create({
            type: body.type,
            message: body.message,
            data: body.data,
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Failed to save log:', error);
        return NextResponse.json({ error: 'Failed to save log' }, { status: 500 });
    }
}
