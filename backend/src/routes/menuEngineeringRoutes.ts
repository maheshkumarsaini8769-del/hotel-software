import { Router } from 'express';
import {
  generateMenuEngineeringReport,
  getMenuEngineeringReports,
  simulateMenuPriceChange,
} from '../controllers/menuEngineeringController';
import { authenticateJWT, requireTenant } from '../middlewares/auth';

const router = Router();

// Multi-tenant auth isolation
router.use(authenticateJWT, requireTenant);

// Menu Engineering Matrix Endpoints
router.post('/reports', generateMenuEngineeringReport);
router.get('/reports', getMenuEngineeringReports);
router.post('/simulate', simulateMenuPriceChange);

export default router;
