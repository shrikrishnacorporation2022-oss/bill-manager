import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBill extends Document {
    masterId: mongoose.Types.ObjectId;
    amount: number;
    billDate: Date;
    dueDate: Date;
    status: 'Pending' | 'Paid' | 'Overdue';
    receiptUrl?: string; // Google Drive Link
    description?: string;
}

const BillSchema: Schema = new Schema({
    masterId: { type: Schema.Types.ObjectId, ref: 'Master', required: true },
    amount: { type: Number, required: true },
    billDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    status: {
        type: String,
        required: true,
        enum: ['Pending', 'Paid', 'Overdue'],
        default: 'Pending'
    },
    receiptUrl: { type: String },
    description: { type: String },
}, { timestamps: true });

const Bill: Model<IBill> = mongoose.models.Bill || mongoose.model<IBill>('Bill', BillSchema);

export default Bill;
