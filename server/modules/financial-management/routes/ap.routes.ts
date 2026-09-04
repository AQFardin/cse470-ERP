import { Router } from 'express';
import * as ap from '../controllers/ap.controller';
import { requirePermission } from '../../../src/middleware/authorize';

const router = Router();

router.get('/dashboard', requirePermission('ap', 'view_reports'), ap.getDashboard);
router.get('/aging', requirePermission('ap', 'view_reports'), ap.getAging);

router.get('/vendors', requirePermission('ap', 'view'), ap.getVendors);
router.get('/vendors/:id', requirePermission('ap', 'view'), ap.getVendor);
router.post('/vendors', requirePermission('ap', 'create_bill'), ap.createVendor);
router.put('/vendors/:id', requirePermission('ap', 'edit_bill'), ap.updateVendor);
router.get('/vendors/:id/statement', requirePermission('ap', 'view_reports'), ap.getVendorStatement);

router.get('/bills', requirePermission('ap', 'view'), ap.getBills);
router.get('/bills/:id', requirePermission('ap', 'view'), ap.getBill);
router.post('/bills', requirePermission('ap', 'create_bill'), ap.createBill);
router.put('/bills/:id', requirePermission('ap', 'edit_bill'), ap.updateBill);
router.delete('/bills/:id', requirePermission('ap', 'edit_bill'), ap.deleteBill);
router.post('/bills/:id/approve', requirePermission('ap', 'approve_bill'), ap.approveBill);
router.post('/bills/:id/cancel', requirePermission('ap', 'cancel_bill'), ap.cancelBill);

router.get('/payments', requirePermission('ap', 'view_payment'), ap.getPayments);
router.get('/payments/:id', requirePermission('ap', 'view_payment'), ap.getPayment);
router.post('/payments', requirePermission('ap', 'create_payment'), ap.createPayment);
router.post('/payments/:id/reverse', requirePermission('ap', 'reverse_payment'), ap.reversePayment);

export default router;
