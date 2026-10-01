import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRecipeIngredient {
  ingredientName: string;
  quantity: number;
  unit: 'kg' | 'g' | 'l' | 'ml' | 'pcs';
  unitCost: number;
  costContribution: number;
  rawMaterialSku?: string;
}

export interface IRecipe extends Document {
  hotelId: Types.ObjectId;
  menuItemId: Types.ObjectId;
  recipeCode: string;
  title: string;
  yieldPortions: number;
  portionSizeDescription?: string;
  ingredients: IRecipeIngredient[];
  preparationSteps: string[];
  totalBatchCost: number;
  costPerPortion: number;
  targetSellingPrice: number;
  foodCostPercentage: number;
  grossMarginPercentage: number;
  targetCostPercentage: number;
  isActive: boolean;
  lastReviewedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RecipeIngredientSchema = new Schema<IRecipeIngredient>(
  {
    ingredientName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: {
      type: String,
      enum: ['kg', 'g', 'l', 'ml', 'pcs'],
      required: true,
      default: 'kg',
    },
    unitCost: { type: Number, required: true, min: 0 },
    costContribution: { type: Number, required: true, min: 0 },
    rawMaterialSku: { type: String, trim: true },
  },
  { _id: false }
);

const RecipeSchema = new Schema<IRecipe>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true, index: true },
    recipeCode: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    yieldPortions: { type: Number, required: true, default: 1, min: 1 },
    portionSizeDescription: { type: String, trim: true },
    ingredients: [RecipeIngredientSchema],
    preparationSteps: [{ type: String, trim: true }],
    totalBatchCost: { type: Number, required: true, default: 0, min: 0 },
    costPerPortion: { type: Number, required: true, default: 0, min: 0 },
    targetSellingPrice: { type: Number, required: true, default: 0, min: 0 },
    foodCostPercentage: { type: Number, required: true, default: 0, min: 0 },
    grossMarginPercentage: { type: Number, required: true, default: 100 },
    targetCostPercentage: { type: Number, default: 32 },
    isActive: { type: Boolean, default: true, index: true },
    lastReviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

RecipeSchema.index({ hotelId: 1, menuItemId: 1 }, { unique: true });
RecipeSchema.index({ hotelId: 1, recipeCode: 1 });

export const Recipe = mongoose.model<IRecipe>('Recipe', RecipeSchema);
