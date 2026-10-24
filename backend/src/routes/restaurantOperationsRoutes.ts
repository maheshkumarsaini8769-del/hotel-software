import { Router } from 'express';
import { authenticateBackOffice } from '../middlewares/backOfficeAuth';
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
  deleteVoucher,
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
router.get('/settings', getOperationalSettings);
router.put('/settings', updateOperationalSettings);

// Hotel Operational Policies & Compliance Rules
router.get('/policies', getHotelPolicies);
router.put('/policies', updateHotelPolicies);

// Kitchen Sections / Stations
router.get('/kitchen-sections', getKitchenSections);
router.post('/kitchen-sections', createKitchenSection);
router.put('/kitchen-sections/:id', updateKitchenSection);
router.delete('/kitchen-sections/:id', deleteKitchenSection);

// Vouchers & Coupons
router.get('/vouchers', getVouchers);
router.post('/vouchers', createVoucher);
router.delete('/vouchers/:id', deleteVoucher);

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
