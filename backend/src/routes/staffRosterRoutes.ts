import { Router } from 'express';
import {
  createRosterSchedule,
  getRosterSchedules,
  clockInStaff,
  clockOutStaff,
  getAttendanceLogs,
  createTipPoolSession,
  getTipPoolSessions,
  approveTipPoolPayout,
} from '../controllers/staffRosterController';
import { authenticateJWT, requireTenant } from '../middlewares/auth';

const router = Router();

// Multi-tenant auth isolation
router.use(authenticateJWT, requireTenant);

// Shift Rostering & Scheduling
router.post('/schedules', createRosterSchedule);
router.get('/schedules', getRosterSchedules);

// Attendance & Clock Terminal
router.post('/attendance/clock-in', clockInStaff);
router.post('/attendance/clock-out', clockOutStaff);
router.get('/attendance/logs', getAttendanceLogs);

// Gratuity Tip Pool Distribution
router.post('/tips/sessions', createTipPoolSession);
router.get('/tips/sessions', getTipPoolSessions);
router.patch('/tips/sessions/:sessionId/approve', approveTipPoolPayout);

export default router;
