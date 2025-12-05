import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IForwardingActivity extends Document {
    emailId: string; // Gmail message ID
    gmailAccountId: string;
    emailFrom: string;
    emailSubject: string;
    forwardedTo: string;
    masterId: string;
    forwardedAt: Date;
    status: 'success' | 'failed';
    errorMessage?: string;
}

const ForwardingActivitySchema: Schema = new Schema({
    emailId: { type: String, required: true, index: true },
    gmailAccountId: { type: String, required: true },
    emailFrom: { type: String, required: true },
    emailSubject: { type: String, required: true },
    forwardedTo: { type: String, required: true },
    masterId: { type: String, required: true },
    forwardedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['success', 'failed'], required: true },
    errorMessage: { type: String },
}, { timestamps: true });

// Compound index to prevent duplicate processing
ForwardingActivitySchema.index({ emailId: 1, masterId: 1 }, { unique: true });

const ForwardingActivity: Model<IForwardingActivity> =
    mongoose.models.ForwardingActivity || mongoose.model<IForwardingActivity>('ForwardingActivity', ForwardingActivitySchema);

export default ForwardingActivity;
