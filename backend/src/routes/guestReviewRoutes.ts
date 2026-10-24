import { Router } from 'express';
import {
  submitGuestReview,
  getGuestReviews,
  updateServiceRecovery,
  trackGoogleReviewClick,
  getCsatAnalytics,
} from '../controllers/guestReviewController';
import { authenticateBackOffice } from '../middlewares/backOfficeAuth';

const router = Router();

// Multi-tenant auth isolation with back-office terminal support
router.use(authenticateBackOffice);

// Review submission & retrieval
router.post('/submit', submitGuestReview);
router.get('/', getGuestReviews);

// Service recovery & Google review tracking
router.patch('/:reviewId/recovery', updateServiceRecovery);
router.post('/:reviewId/track-google', trackGoogleReviewClick);

// CSAT Analytics & Staff Leaderboard
router.get('/analytics', getCsatAnalytics);

export default router;
