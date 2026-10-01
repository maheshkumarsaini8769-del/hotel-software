import { Router } from 'express';
import {
  getRecipes,
  getRecipeByMenuItem,
  createOrUpdateRecipe,
  logFoodWaste,
  getFoodWasteAudit,
} from '../controllers/recipeCostingController';
import { authenticateJWT, requireTenant } from '../middlewares/auth';

const router = Router();

// Multi-tenant auth isolation
router.use(authenticateJWT, requireTenant);

// Recipe BOM & Food Costing
router.get('/recipes', getRecipes);
router.get('/recipes/menu-item/:menuItemId', getRecipeByMenuItem);
router.post('/recipes', createOrUpdateRecipe);

// Kitchen Food Waste & Spoilage Auditing
router.post('/waste', logFoodWaste);
router.get('/waste/audit', getFoodWasteAudit);

export default router;
