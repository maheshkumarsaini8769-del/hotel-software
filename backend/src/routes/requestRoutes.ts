import { Router } from 'express';
import {
  createServiceRequest,
  acceptServiceRequest,
  completeServiceRequest,
  getWaiterRequests,
  updateWaiterShiftStatus,
} from '../controllers/requestController';
import { authenticateJWT, requireTenant } from '../middlewares/auth';

const router = Router();

// Public Customer Request Trigger
router.post('/create', createServiceRequest);

// Protected Waiter / Staff actions
router.get('/waiter/assigned', authenticateJWT, requireTenant, getWaiterRequests);
router.patch('/waiter/shift-status', authenticateJWT, requireTenant, updateWaiterShiftStatus);

router.patch('/:requestId/accept', authenticateJWT, requireTenant, acceptServiceRequest);
router.patch('/:requestId/complete', authenticateJWT, requireTenant, completeServiceRequest);

export default router;


