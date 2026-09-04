import { Router } from 'express';
import * as ar from '../controllers/ar.controller';
import { requirePermission } from '../../../src/middleware/authorize';

const router = Router();

router.get('/dashboard', requirePermission('ar', 'view_reports'), ar.getDashboard);
router.get('/aging', requirePermission('ar', 'view_reports'), ar.getAging);

router.get('/customers/:id/statement', requirePermission('ar', 'view_reports'), ar.getCustomerStatement);

router.get('/invoices', requirePermission('ar', 'view'), ar.getInvoices);
router.get('/invoices/:id', requirePermission('ar', 'view'), ar.getInvoice);
router.post('/invoices', requirePermission('ar', 'create_invoice'), ar.createInvoice);
router.put('/invoices/:id', requirePermission('ar', 'edit_invoice'), ar.updateInvoice);
router.delete('/invoices/:id', requirePermission('ar', 'edit_invoice'), ar.deleteInvoice);
router.post('/invoices/:id/issue', requirePermission('ar', 'issue_invoice'), ar.issueInvoice);
router.post('/invoices/:id/cancel', requirePermission('ar', 'cancel_invoice'), ar.cancelInvoice);

router.get('/payments', requirePermission('ar', 'view_payment'), ar.getPayments);
router.get('/payments/:id', requirePermission('ar', 'view_payment'), ar.getPayment);
router.post('/payments', requirePermission('ar', 'create_payment'), ar.createPayment);
router.post('/payments/:id/reverse', requirePermission('ar', 'reverse_payment'), ar.reversePayment);

export default router;
