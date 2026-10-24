import { Router } from 'express';
import { getDashboardOverview } from '../controllers/dashboardController';
import { authenticateJWT, requireTenant } from '../middlewares/auth';

const router = Router();

router.use(authenticateJWT, requireTenant);

router.get('/overview', getDashboardOverview);

export default router;
