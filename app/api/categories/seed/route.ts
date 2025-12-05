import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import Category from '@/models/Category';

// Seed default categories for new users
export async function POST() {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userEmail = session.user.email;

        await dbConnect();

        // Check if user already has categories
        const existingCount = await Category.countDocuments({ userId: userEmail });
        if (existingCount > 0) {
            return NextResponse.json({ message: 'Categories already exist' });
        }

        // Create default categories
        const defaults = [
            { name: 'Electricity', icon: 'Zap', color: 'yellow' },
            { name: 'Phone', icon: 'Phone', color: 'green' },
            { name: 'Internet', icon: 'Wifi', color: 'blue' },
            { name: 'Property Tax', icon: 'Home', color: 'purple' },
            { name: 'Insurance', icon: 'Car', color: 'red' },
            { name: 'Rent', icon: 'Home', color: 'orange' },
            { name: 'Water Bill', icon: 'Droplet', color: 'cyan' },
            { name: 'Gas Bill', icon: 'Flame', color: 'red' },
        ];

        await Category.insertMany(
            defaults.map(cat => ({ ...cat, userId: userEmail }))
        );

        return NextResponse.json({ success: true, message: 'Default categories created' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to seed categories' }, { status: 500 });
    }
}
