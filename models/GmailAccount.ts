import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGmailAccount extends Document {
    userId: string; // User who connected this account
    email: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const GmailAccountSchema: Schema = new Schema({
    userId: { type: String, required: true },
    email: { type: String, required: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

const GmailAccount: Model<IGmailAccount> =
    mongoose.models.GmailAccount || mongoose.model<IGmailAccount>('GmailAccount', GmailAccountSchema);

export default GmailAccount;
