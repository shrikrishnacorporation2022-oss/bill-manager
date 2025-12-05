import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMaster extends Document {
    name: string;
    category: 'Electricity' | 'Phone' | 'Internet' | 'PropertyTax' | 'Insurance' | 'Other';
    consumerNumber?: string; // For EB, Phone
    policyNumber?: string; // For Insurance
    provider?: string; // e.g., Airtel, TNEB
    dueDateDay?: number; // e.g., 5th of every month
    renewalDate?: Date; // For Insurance/RC
    emailKeywords?: string[]; // Keywords to look for in emails
    emailSender?: string; // Specific sender email
    autoForwardTo?: string; // Email to forward to
    whatsappReminder: boolean;
    userId: string; // For future multi-user support, or just 'admin'
    isTelegramForwarding?: boolean; // Special flag for Telegram forwarding master
}

const MasterSchema: Schema = new Schema({
    name: { type: String, required: true },
    category: {
        type: String,
        required: true,
        enum: ['Electricity', 'Phone', 'Internet', 'PropertyTax', 'Insurance', 'Other']
    },
    consumerNumber: { type: String },
    policyNumber: { type: String },
    provider: { type: String },
    dueDateDay: { type: Number },
    renewalDate: { type: Date },
    emailKeywords: [{ type: String }],
    emailSender: { type: String },
    autoForwardTo: { type: String },
    whatsappReminder: { type: Boolean, default: true },
    userId: { type: String, default: 'admin' },
    isTelegramForwarding: { type: Boolean, default: false },
}, { timestamps: true });

const Master: Model<IMaster> = mongoose.models.Master || mongoose.model<IMaster>('Master', MasterSchema);

export default Master;
