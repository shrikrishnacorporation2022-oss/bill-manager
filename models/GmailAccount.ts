import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGmailAccount extends Document {
    userId: string;
    email: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    isActive: boolean;
    historyId?: string;
    watchExpiration?: Date;
    lastSuccessfulCheck?: Date;
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
    historyId: { type: String },
    watchExpiration: { type: Date },
    lastSuccessfulCheck: { type: Date, default: () => new Date() },
}, { timestamps: true });

const GmailAccount: Model<IGmailAccount> =
    mongoose.models.GmailAccount || mongoose.model<IGmailAccount>('GmailAccount', GmailAccountSchema);

export default GmailAccount;
