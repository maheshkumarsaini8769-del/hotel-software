import { Types } from 'mongoose';
import { Recipe } from '../models/Recipe';
import { StockBatch } from '../models/StockBatch';
import { MenuItem } from '../models/MenuItem';

export interface DeductStockResult {
  ingredientName: string;
  deductedQuantity: number;
  remainingTotalStock: number;
  unit: string;
  isLowStock: boolean;
  isDepleted: boolean;
}

export class InventoryBomService {
  /**
   * Deducts raw materials according to Recipe BOM for each item in an order
   * Uses FEFO (First-Expiry-First-Out) batch allocation
   */
  public static async deductStockForOrder(
    order: {
      _id?: any;
      orderNumber: string;
      items: Array<{
        menuItemId?: any;
        name: string;
        quantity: number;
      }>;
    },
    hotelId: string | Types.ObjectId,
    io?: any
  ): Promise<DeductStockResult[]> {
    const results: DeductStockResult[] = [];
    const hId = new Types.ObjectId(hotelId);

    for (const orderItem of order.items) {
      if (!orderItem.menuItemId) continue;

      const mId = new Types.ObjectId(orderItem.menuItemId);
      const recipe = await Recipe.findOne({
        hotelId: hId,
        menuItemId: mId,
        isActive: true,
      });

      if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) {
        continue;
      }

      const orderQty = orderItem.quantity || 1;
      const yieldPortions = recipe.yieldPortions || 1;

      for (const ingredient of recipe.ingredients) {
        const requiredQty = (ingredient.quantity / yieldPortions) * orderQty;

        // Fetch stock batches sorted by expiryDate ascending (FEFO)
        const batches = await StockBatch.find({
          hotelId: hId,
          itemName: { $regex: new RegExp(`^${ingredient.ingredientName}$`, 'i') },
          currentQuantity: { $gt: 0 },
        }).sort({ expiryDate: 1 });

        let qtyNeeded = requiredQty;
        let actualDeducted = 0;

        for (const batch of batches) {
          if (qtyNeeded <= 0) break;

          if (batch.currentQuantity >= qtyNeeded) {
            batch.currentQuantity = Math.round((batch.currentQuantity - qtyNeeded) * 1000) / 1000;
            actualDeducted += qtyNeeded;
            qtyNeeded = 0;
          } else {
            actualDeducted += batch.currentQuantity;
            qtyNeeded -= batch.currentQuantity;
            batch.currentQuantity = 0;
          }
          await batch.save();
        }

        // Calculate remaining aggregate stock for this ingredient across all batches
        const remainingBatches = await StockBatch.find({
          hotelId: hId,
          itemName: { $regex: new RegExp(`^${ingredient.ingredientName}$`, 'i') },
        });

        const totalRemaining = remainingBatches.reduce((sum, b) => sum + (b.currentQuantity || 0), 0);
        const roundedRemaining = Math.round(totalRemaining * 1000) / 1000;

        // Low stock threshold: <= 5 kg / L or <= 10 pcs
        const lowStockThreshold = ingredient.unit === 'pcs' ? 10 : 5;
        const isLowStock = roundedRemaining <= lowStockThreshold && roundedRemaining > 0;
        const isDepleted = roundedRemaining <= 0;

        const result: DeductStockResult = {
          ingredientName: ingredient.ingredientName,
          deductedQuantity: Math.round(actualDeducted * 1000) / 1000,
          remainingTotalStock: roundedRemaining,
          unit: ingredient.unit,
          isLowStock,
          isDepleted,
        };
        results.push(result);

        // Real-time Socket Broadcasts for Inventory Alerts
        if (io) {
          if (isLowStock) {
            console.log(`⚠️ [BOM Inventory Alert] LOW STOCK: ${ingredient.ingredientName} (${roundedRemaining} ${ingredient.unit} remaining)`);
            const alertPayload = {
              hotelId: hId.toString(),
              type: 'LOW_STOCK',
              ingredientName: ingredient.ingredientName,
              remainingQuantity: roundedRemaining,
              unit: ingredient.unit,
              threshold: lowStockThreshold,
              triggeredByOrder: order.orderNumber,
              timestamp: new Date().toISOString(),
            };
            io.to(`${hId}_kds`).emit('stock:low_alert', alertPayload);
            io.to(`${hId}_global`).emit('stock:low_alert', alertPayload);
            io.to(`${hId}_waiters`).emit('stock:low_alert', alertPayload);
          }

          if (isDepleted) {
            console.log(`🚨 [BOM Inventory Alert] STOCK DEPLETED: ${ingredient.ingredientName}! Auto-86 item check.`);
            // Auto toggle menu item 86 if main ingredient is depleted
            await MenuItem.updateOne(
              { _id: mId, hotelId: hId },
              { $set: { isAvailable: false, outOfStockReason: `Out of raw material: ${ingredient.ingredientName}` } }
            );

            const depletedPayload = {
              hotelId: hId.toString(),
              type: 'STOCK_DEPLETED',
              menuItemId: mId.toString(),
              dishName: orderItem.name,
              ingredientName: ingredient.ingredientName,
              timestamp: new Date().toISOString(),
            };
            io.to(`${hId}_kds`).emit('menu:item_86_toggled', depletedPayload);
            io.to(`${hId}_global`).emit('menu:item_86_toggled', depletedPayload);
            io.to(`${hId}_waiters`).emit('menu:item_86_toggled', depletedPayload);
          }
        }
      }
    }

    return results;
  }
}
