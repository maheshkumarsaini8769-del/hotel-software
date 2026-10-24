import { Router } from 'express';
import { authenticateBackOffice } from '../middlewares/backOfficeAuth';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleItem86,
} from '../controllers/menuCatalogController';

const router = Router();

router.use(authenticateBackOffice);

// 1. Categories Management Routes
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.patch('/categories/:id', updateCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// 2. Menu Items Management Routes
router.get('/items', getMenuItems);
router.post('/items', createMenuItem);
router.patch('/items/:id', updateMenuItem);
router.put('/items/:id', updateMenuItem);
router.delete('/items/:id', deleteMenuItem);
router.patch('/items/:id/toggle-86', toggleItem86);

export default router;
