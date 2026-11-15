import { Router } from 'express';
import {
  getPayrollStaffList,
  recordSalaryTransaction,
  updateSalaryTransaction,
  deleteSalaryTransaction,
  getStaffLedger,
  updateStaffSalary,
  getPayrollPolicy,
  updatePayrollPolicy,
  updateStaffDeductionPolicy,
  getPayrollAttendanceBoard,
  markStaffAttendance,
  triggerAutoAttendanceSync,
} from '../controllers/payrollController';
import { authenticateBackOffice } from '../middlewares/backOfficeAuth';

const router = Router();

// Back-office / staff authentication
router.use(authenticateBackOffice);

// Payroll APIs
router.get('/staff-list', getPayrollStaffList);
router.post('/transaction', recordSalaryTransaction);
router.put('/transaction/:transactionId', updateSalaryTransaction);
router.delete('/transaction/:transactionId', deleteSalaryTransaction);
router.get('/ledger/:staffId', getStaffLedger);
router.put('/staff/:staffId/salary', updateStaffSalary);
router.put('/staff/:staffId/deduction-policy', updateStaffDeductionPolicy);

// Attendance Automation & Portal Deduction Rules APIs
router.get('/policy', getPayrollPolicy);
router.put('/policy', updatePayrollPolicy);
router.get('/attendance', getPayrollAttendanceBoard);
router.post('/attendance/mark', markStaffAttendance);
router.post('/attendance/auto-sync', triggerAutoAttendanceSync);

export default router;
