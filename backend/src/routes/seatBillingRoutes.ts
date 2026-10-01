import { Router } from 'express';
import { SeatBillingController } from '../controllers/seatBillingController';

const router = Router();

router.post('/sub-folio', SeatBillingController.generateOrGetSubFolio);
router.post('/sub-folio/:subFolioId/items', SeatBillingController.addItemsToSubFolio);
router.get('/table/:tableId', SeatBillingController.getTableSubFolios);
router.post('/sub-folio/:subFolioId/settle', SeatBillingController.settleSubFolio);
router.post('/merge', SeatBillingController.mergeSubFolios);
router.get('/sub-folio/:subFolioId/receipt', SeatBillingController.getSubFolioReceipt);

export default router;
