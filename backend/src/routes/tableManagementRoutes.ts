import { Router } from 'express';
import { authenticateBackOffice } from '../middlewares/backOfficeAuth';
import {
  getTableManagementOverview,
  getFloorsAndHalls,
  createFloor,
  createHall,
  getTables,
  createTable,
  updateTable,
  updateTableStatus,
  deleteTable,
} from '../controllers/tableManagementController';

const router = Router();

router.use(authenticateBackOffice);

router.get('/overview', getTableManagementOverview);
router.get('/floors-halls', getFloorsAndHalls);
router.post('/floors', createFloor);
router.post('/halls', createHall);
router.get('/tables', getTables);
router.post('/tables', createTable);
router.patch('/tables/:id', updateTable);
router.patch('/tables/:id/status', updateTableStatus);
router.delete('/tables/:id', deleteTable);

export default router;
