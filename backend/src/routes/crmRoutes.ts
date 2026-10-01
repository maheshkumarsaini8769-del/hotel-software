import { Router } from 'express';
import {
  createOrUpdateGuestProfile,
  getGuestProfile360,
  searchGuests,
} from '../controllers/crmController';
import {
  earnLoyaltyPoints,
  redeemLoyaltyPoints,
  getLoyaltyLedger,
} from '../controllers/loyaltyController';
import {
  createCampaign,
  dispatchCampaign,
  getCampaigns,
} from '../controllers/marketingController';
import { authenticateJWT, requireTenant } from '../middlewares/auth';

const router = Router();

// Apply auth & tenant isolation to CRM, Loyalty & Marketing
router.use(authenticateJWT, requireTenant);

// Guest Profile 360
router.post('/profiles', createOrUpdateGuestProfile);
router.get('/profiles/:guestId', getGuestProfile360);
router.get('/search', searchGuests);

// Loyalty Points Engine
router.post('/loyalty/earn', earnLoyaltyPoints);
router.post('/loyalty/redeem', redeemLoyaltyPoints);
router.get('/loyalty/ledger', getLoyaltyLedger);

// Marketing Campaigns
router.post('/campaigns', createCampaign);
router.post('/campaigns/:campaignId/dispatch', dispatchCampaign);
router.get('/campaigns', getCampaigns);

export default router;
