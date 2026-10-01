import { Router } from 'express';
import {
  createAsset,
  getAssets,
  createMaintenanceTicket,
  assignTechnician,
  updateTicketProgress,
  resolveMaintenanceTicket,
  getMaintenanceDashboard,
} from '../controllers/maintenanceController';
import { authenticateJWT, requireTenant } from '../middlewares/auth';

const router = Router();

// Apply auth & tenant isolation to all maintenance operations
router.use(authenticateJWT, requireTenant);

// Asset Management
router.post('/assets', createAsset);
router.get('/assets', getAssets);

// Ticket Management
router.post('/tickets', createMaintenanceTicket);
router.put('/tickets/:ticketId/assign', assignTechnician);
router.put('/tickets/:ticketId/progress', updateTicketProgress);
router.put('/tickets/:ticketId/resolve', resolveMaintenanceTicket);
router.get('/dashboard', getMaintenanceDashboard);

export default router;
