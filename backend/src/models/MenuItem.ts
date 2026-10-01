import mongoose, { Schema, Document, Types } from 'mongoose';

export enum FoodType {
  VEG = 'VEG',
  NON_VEG = 'NON_VEG',
  VEGAN = 'VEGAN',
  EGG = 'EGG',
  BEVERAGE = 'BEVERAGE'
}

export interface IMenuItemVariant {
  name: string; // 'Half', 'Full', 'Regular', 'Large'
  price: number;
}

export interface IMenuItemAddon {
  name: string;
  price: number;
}

export interface IMenuItem extends Document {
  hotelId: Types.ObjectId;
  categoryId: Types.ObjectId;
  kitchenStationId: Types.ObjectId;
  name: string;
  description?: string;
  foodType: FoodType;
  basePrice: number;
  hasVariants: boolean;
  variants: IMenuItemVariant[];
  addons: IMenuItemAddon[];
  isAvailable: boolean; // Instant Item 86 toggle
  outOfStockReason?: string;
  markedOutOfStockAt?: Date;
  markedOutOfStockBy?: string;
  restockedAt?: Date;
  restockedBy?: string;
  prepTimeMinutes: number;
  allergens?: string[];
  dietaryType?: string;
  hasJainOption?: boolean;
  hsnCode?: string;
  itemCode?: string; // Fast 10-key shortcut (e.g. '101', '204')
  barcode?: string;  // Barcode SKU scan
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

const MenuItemSchema = new Schema<IMenuItem>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'MenuCategory', required: true, index: true },
    kitchenStationId: { type: Schema.Types.ObjectId, ref: 'KitchenStation', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    foodType: {
      type: String,
      enum: Object.values(FoodType),
      default: FoodType.VEG,
      index: true,
    },
    basePrice: { type: Number, required: true, min: 0 },
    hasVariants: { type: Boolean, default: false },
    variants: [
      {
        name: { type: String, required: true },
        price: { type: Number, required: true, min: 0 },
      },
    ],
    addons: [
      {
        name: { type: String, required: true },
        price: { type: Number, required: true, min: 0 },
      },
    ],
    isAvailable: { type: Boolean, default: true, index: true },
    outOfStockReason: { type: String, trim: true },
    markedOutOfStockAt: { type: Date },
    markedOutOfStockBy: { type: String, trim: true },
    restockedAt: { type: Date },
    restockedBy: { type: String, trim: true },
    prepTimeMinutes: { type: Number, default: 15, min: 1 },
    allergens: [{ type: String }],
    dietaryType: { type: String },
    hasJainOption: { type: Boolean, default: false },
    hsnCode: { type: String, default: '9963' }, // Standard restaurant food SAC code
    itemCode: { type: String, trim: true, index: true },
    barcode: { type: String, trim: true, index: true },
    images: [{ type: String }],
  },
  { timestamps: true }
);

MenuItemSchema.index({ hotelId: 1, name: 1 }, { unique: true });

export const MenuItem = mongoose.model<IMenuItem>('MenuItem', MenuItemSchema);
