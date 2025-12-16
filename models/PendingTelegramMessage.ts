import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPendingTelegramMessage extends Document {
    chatId: string;
    messageId: number;
    text?: string;
    photoFileId?: string;
    documentFileId?: string;
    receivedAt: Date;
    processed: boolean;
    processedAt?: Date;
    error?: string;
    createdAt: Date;
}

const PendingTelegramMessageSchema: Schema = new Schema({
    chatId: { type: String, required: true },
    messageId: { type: Number, required: true },
    text: { type: String },
    photoFileId: { type: String },
    documentFileId: { type: String },
    receivedAt: { type: Date, required: true, default: () => new Date() },
    processed: { type: Boolean, default: false },
    processedAt: { type: Date },
    error: { type: String },
}, { timestamps: true });

const PendingTelegramMessage: Model<IPendingTelegramMessage> =
    mongoose.models.PendingTelegramMessage ||
    mongoose.model<IPendingTelegramMessage>('PendingTelegramMessage', PendingTelegramMessageSchema);

export default PendingTelegramMessage;
