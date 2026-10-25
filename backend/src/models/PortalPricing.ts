import mongoose, { Schema, Document } from 'mongoose';
import { PortalKey, DEFAULT_PORTAL_CATALOG } from '@spicehub/shared-types';

export interface IPortalPricing extends Document {
  portalKey: PortalKey;
  name: string;
  role: string;
  port: number;
  category: 'GUEST' | 'OPERATIONS' | 'BILLING' | 'MANAGEMENT';
  categoryLabel: string;
  defaultMonthlyPriceINR: number;
  badge: string;
  emoji: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PortalPricingSchema = new Schema<IPortalPricing>(
  {
    portalKey: {
      type: String,
      required: true,
      unique: true,
      enum: ['admin', 'cashier', 'reception', 'kds', 'waiter', 'customer', 'guest'],
      index: true,
    },
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    port: { type: Number, required: true },
    category: {
      type: String,
      enum: ['GUEST', 'OPERATIONS', 'BILLING', 'MANAGEMENT'],
      required: true,
    },
    categoryLabel: { type: String, required: true },
    defaultMonthlyPriceINR: { type: Number, required: true, min: 0 },
    badge: { type: String, default: '' },
    emoji: { type: String, default: '💻' },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const PortalPricing = mongoose.model<IPortalPricing>('PortalPricing', PortalPricingSchema);

/**
 * Ensures the database has the default portal catalog seeded if empty.
 */
export async function ensureDefaultPortalPricing(): Promise<void> {
  try {
    const count = await PortalPricing.countDocuments();
    if (count === 0) {
      const docs = DEFAULT_PORTAL_CATALOG.map((item) => ({
        portalKey: item.id,
        name: item.name,
        role: item.role,
        port: item.port,
        category: item.category,
        categoryLabel: item.categoryLabel,
        defaultMonthlyPriceINR: item.defaultMonthlyPriceINR,
        badge: item.badge,
        emoji: item.emoji,
        description: item.description,
        isActive: true,
      }));
      await PortalPricing.insertMany(docs);
    }
  } catch (err) {
    console.error('[PortalPricing] Failed to seed default pricing:', err);
  }
}
