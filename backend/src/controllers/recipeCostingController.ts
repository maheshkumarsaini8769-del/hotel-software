import { Response } from 'express';
import { Types } from 'mongoose';
import { Recipe } from '../models/Recipe';
import { FoodWasteLog, WasteType, KitchenShift, WasteDisposalMethod } from '../models/FoodWasteLog';
import { MenuItem } from '../models/MenuItem';
import { TenantRequest } from '../types';
import { escapeRegex } from '../utils/security';

// 1. Get All Recipes with Live Metrics
export const getRecipes = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { search, station } = req.query;
    const filter: any = { hotelId, isActive: true };

    if (search && typeof search === 'string') {
      const safeSearch = escapeRegex(search.trim());
      filter.$or = [
        { title: { $regex: safeSearch, $options: 'i' } },
        { recipeCode: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const recipes = await Recipe.find(filter).populate('menuItemId').sort({ foodCostPercentage: -1 });

    const totalRecipesCount = recipes.length;
    let highCostRecipesCount = 0;
    let totalFoodCostPctSum = 0;

    recipes.forEach((r) => {
      totalFoodCostPctSum += r.foodCostPercentage || 0;
      if (r.foodCostPercentage > (r.targetCostPercentage || 32)) {
        highCostRecipesCount++;
      }
    });

    const averageFoodCostPercentage = totalRecipesCount > 0 ? Math.round((totalFoodCostPctSum / totalRecipesCount) * 10) / 10 : 0;

    res.status(200).json({
      success: true,
      metrics: {
        totalRecipesCount,
        highCostRecipesCount,
        averageFoodCostPercentage,
        targetFoodCostPercentage: 32,
      },
      recipes,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 2. Get Recipe by MenuItem ID
export const getRecipeByMenuItem = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const menuItemId = String(req.params.menuItemId);

    const recipe = await Recipe.findOne({
      hotelId,
      menuItemId: new Types.ObjectId(menuItemId),
    }).populate('menuItemId');

    if (!recipe) {
      res.status(404).json({ success: false, errorCode: 'RECIPE_NOT_FOUND', message: 'Recipe specification not found for item' });
      return;
    }

    res.status(200).json({ success: true, recipe });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 3. Create or Update Standard Recipe Specification & BOM
export const createOrUpdateRecipe = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const {
      menuItemId,
      title,
      recipeCode,
      yieldPortions = 1,
      portionSizeDescription,
      ingredients = [],
      preparationSteps = [],
      sellingPrice,
      targetCostPercentage = 32,
    } = req.body;

    if (!menuItemId) {
      res.status(400).json({ success: false, errorCode: 'MISSING_MENU_ITEM', message: 'Menu Item ID is required' });
      return;
    }

    const item = await MenuItem.findOne({ _id: new Types.ObjectId(menuItemId), hotelId });
    if (!item) {
      res.status(404).json({ success: false, errorCode: 'ITEM_NOT_FOUND', message: 'Menu item not found in catalog' });
      return;
    }

    const targetSellingPrice = sellingPrice !== undefined ? Number(sellingPrice) : item.basePrice;

    // Calculate Ingredients Cost Contributions
    let totalBatchCost = 0;
    const computedIngredients = ingredients.map((ing: any) => {
      const qty = Number(ing.quantity) || 0;
      const uCost = Number(ing.unitCost) || 0;
      const contribution = Math.round(qty * uCost * 100) / 100;
      totalBatchCost += contribution;
      return {
        ingredientName: ing.ingredientName,
        quantity: qty,
        unit: ing.unit || 'kg',
        unitCost: uCost,
        costContribution: contribution,
        rawMaterialSku: ing.rawMaterialSku,
      };
    });

    totalBatchCost = Math.round(totalBatchCost * 100) / 100;
    const portions = Math.max(1, Number(yieldPortions));
    const costPerPortion = Math.round((totalBatchCost / portions) * 100) / 100;

    let foodCostPercentage = 0;
    if (targetSellingPrice > 0) {
      foodCostPercentage = Math.round((costPerPortion / targetSellingPrice) * 1000) / 10;
    }
    const grossMarginPercentage = Math.max(0, Math.round((100 - foodCostPercentage) * 10) / 10);

    const generatedCode = recipeCode || `RCP-${Date.now().toString().slice(-4)}`;

    const recipe = await Recipe.findOneAndUpdate(
      { hotelId, menuItemId: new Types.ObjectId(menuItemId) },
      {
        hotelId,
        menuItemId: new Types.ObjectId(menuItemId),
        recipeCode: generatedCode,
        title: title || `${item.name} Recipe`,
        yieldPortions: portions,
        portionSizeDescription,
        ingredients: computedIngredients,
        preparationSteps,
        totalBatchCost,
        costPerPortion,
        targetSellingPrice,
        foodCostPercentage,
        grossMarginPercentage,
        targetCostPercentage,
        isActive: true,
        lastReviewedBy: req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined,
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Recipe specification saved with live portion costing',
      recipe,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 4. Log Kitchen Spoilage / Food Waste Entry
export const logFoodWaste = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const {
      wasteType = WasteType.SPOILED,
      kitchenStationId,
      menuItemId,
      itemName,
      quantity,
      unit = 'kg',
      unitCost,
      shift = KitchenShift.DINNER,
      reason,
      preventiveAction,
      disposalMethod = WasteDisposalMethod.TRASH,
    } = req.body;

    if (!itemName || quantity === undefined || unitCost === undefined || !reason) {
      res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_FAILED',
        message: 'Item name, quantity, unitCost, and reason are required',
      });
      return;
    }

    const qty = Number(quantity);
    const uCost = Number(unitCost);
    const totalLossAmount = Math.round(qty * uCost * 100) / 100;
    const wasteNumber = `WST-${Date.now().toString().slice(-6)}`;

    const wasteLog = new FoodWasteLog({
      hotelId,
      wasteNumber,
      wasteType,
      kitchenStationId: kitchenStationId ? new Types.ObjectId(kitchenStationId) : undefined,
      menuItemId: menuItemId ? new Types.ObjectId(menuItemId) : undefined,
      itemName,
      quantity: qty,
      unit,
      unitCost: uCost,
      totalLossAmount,
      shift,
      reason,
      preventiveAction,
      reportedByUserId: req.user?.userId ? new Types.ObjectId(req.user.userId) : new Types.ObjectId(),
      disposalMethod,
      loggedAt: new Date(),
    });
    await wasteLog.save();

    res.status(201).json({
      success: true,
      message: `Food waste entry ${wasteNumber} audited successfully`,
      wasteLog,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 5. Get Comprehensive Food Waste & Spoilage Audit Report
export const getFoodWasteAudit = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { days = 30, wasteType } = req.query;
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - Number(days));

    const filter: any = {
      hotelId,
      loggedAt: { $gte: sinceDate },
    };

    if (wasteType && typeof wasteType === 'string' && wasteType !== 'ALL') {
      filter.wasteType = wasteType;
    }

    const logs = await FoodWasteLog.find(filter)
      .populate('reportedByUserId', 'name role')
      .populate('kitchenStationId', 'stationName')
      .sort({ loggedAt: -1 });

    let totalLossAmount = 0;
    const wasteBreakdownByType: Record<string, number> = {};
    const lossByShift: Record<string, number> = {};

    logs.forEach((log) => {
      totalLossAmount += log.totalLossAmount || 0;
      wasteBreakdownByType[log.wasteType] = (wasteBreakdownByType[log.wasteType] || 0) + log.totalLossAmount;
      lossByShift[log.shift] = (lossByShift[log.shift] || 0) + log.totalLossAmount;
    });

    totalLossAmount = Math.round(totalLossAmount * 100) / 100;

    res.status(200).json({
      success: true,
      summary: {
        totalEntriesCount: logs.length,
        totalLossAmount,
        daysAudited: Number(days),
        wasteBreakdownByType,
        lossByShift,
      },
      logs,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};
