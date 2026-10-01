import { Router } from 'express';
import {
  createOrUpdateRevenueStrategy,
  getRevenueStrategies,
  calculateDynamicRateQuote,
  updateCompetitorBenchmark,
  applyDynamicRateToLiveInventory,
} from '../controllers/revenueManagerController';
import { authenticateJWT, requireTenant } from '../middlewares/auth';

const router = Router();

// Multi-tenant auth isolation
router.use(authenticateJWT, requireTenant);

// Revenue Manager & Dynamic Pricing Routes
router.post('/strategy', createOrUpdateRevenueStrategy);
router.get('/strategies', getRevenueStrategies);
router.post('/quote-rate', calculateDynamicRateQuote);
router.post('/competitors/benchmark', updateCompetitorBenchmark);
router.post('/apply-to-inventory', applyDynamicRateToLiveInventory);

export default router;
