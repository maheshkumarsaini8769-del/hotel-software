import { Router } from 'express';
import { authenticateBackOffice } from '../middlewares/backOfficeAuth';
import { requireRole } from '../middlewares/auth';
import { UserRole } from '../types';
import {
  getRestaurantInfo,
  updateRestaurantInfo,
  getOperationalSettings,
  updateOperationalSettings,
  getHotelPolicies,
  updateHotelPolicies,
  getKitchenSections,
  createKitchenSection,
  updateKitchenSection,
  deleteKitchenSection,
  getVouchers,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  validateVoucher,
  getWallets,
  topUpWallet,
  getWarehouses,
  createWarehouse,
  getWorkPeriodReport,
  getAccountingReport,
  getSystemLogs,
} from '../controllers/restaurantOperationsController';

const router = Router();

router.use(authenticateBackOffice);

// Restaurant Info
router.get('/info', getRestaurantInfo);
router.put('/info', updateRestaurantInfo);

// Operational Settings
router.get('/settings', requireRole([UserRole.HOTEL_ADMIN, UserRole.MANAGER]), getOperationalSettings);
router.put('/settings', requireRole([UserRole.HOTEL_ADMIN, UserRole.MANAGER]), updateOperationalSettings);

// Hotel Operational Policies & Compliance Rules
router.get('/policies', requireRole([UserRole.HOTEL_ADMIN, UserRole.MANAGER]), getHotelPolicies);
router.put('/policies', requireRole([UserRole.HOTEL_ADMIN, UserRole.MANAGER]), updateHotelPolicies);

// Kitchen Sections / Stations
router.get('/kitchen-sections', getKitchenSections);
router.post('/kitchen-sections', createKitchenSection);
router.put('/kitchen-sections/:id', updateKitchenSection);
router.delete('/kitchen-sections/:id', deleteKitchenSection);

// Vouchers & Coupons
router.get('/vouchers', getVouchers);
router.post('/vouchers', createVoucher);
router.put('/vouchers/:id', updateVoucher);
router.delete('/vouchers/:id', deleteVoucher);
router.post('/vouchers/validate', validateVoucher);

// Wallets & Loyalty
router.get('/wallets', getWallets);
router.post('/wallets/topup', topUpWallet);

// Warehouses & Stores
router.get('/warehouses', getWarehouses);
router.post('/warehouses', createWarehouse);

// Work Period Report (Z-Report)
router.get('/work-period-report', getWorkPeriodReport);

// Accounting Report
router.get('/account-report', getAccountingReport);

// System Logs
router.get('/logs', getSystemLogs);

export default router;
