import { Router } from 'express';
import { authenticateBackOffice } from '../middlewares/backOfficeAuth';
import { CoDiningController } from '../controllers/coDiningController';

const router = Router();

router.use(authenticateBackOffice);

router.get('/tables', CoDiningController.getCommunityTables);
router.post('/table/:tableId/enable-sharing', CoDiningController.enableTableSharing);
router.post('/allocate-seat', CoDiningController.allocateSeats);
router.post('/release-seat', CoDiningController.releaseSeats);
router.get('/table/:tableId/seats', CoDiningController.getTableSeatMap);

export default router;
