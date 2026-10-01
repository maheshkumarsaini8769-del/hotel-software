import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMenuCategory extends Document {
  hotelId: Types.ObjectId;
  name: string;
  slug: string;
  displayOrder: number;
  kitchenStationId?: Types.ObjectId;
  isActive: boolean;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MenuCategorySchema = new Schema<IMenuCategory>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    displayOrder: { type: Number, default: 0 },
    kitchenStationId: { type: Schema.Types.ObjectId, ref: 'KitchenStation' },
    isActive: { type: Boolean, default: true, index: true },
    imageUrl: { type: String },
  },
  { timestamps: true }
);

MenuCategorySchema.index({ hotelId: 1, slug: 1 }, { unique: true });

export const MenuCategory = mongoose.model<IMenuCategory>('MenuCategory', MenuCategorySchema);
