import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICategory extends Document {
    name: string;
    icon: string; // Icon name from lucide-react
    color: string; // Tailwind color class
    userId: string;
}

const CategorySchema: Schema = new Schema({
    name: { type: String, required: true },
    icon: { type: String, default: 'CreditCard' },
    color: { type: String, default: 'gray' },
    userId: { type: String, required: true },
}, { timestamps: true });

const Category: Model<ICategory> =
    mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);

export default Category;
