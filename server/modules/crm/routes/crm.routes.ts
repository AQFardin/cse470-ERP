import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  addInteraction,
  deleteInteraction,
  getLeads,
  getLeadById,
  createLead,
  calculateScore,
  convertToCustomer,
  markLost,
  deleteLead,
  getPipelines,
  createPipeline,
  advanceStage,
  deletePipeline,
  getReports,
  createReport,
  deleteReport
} from '../controllers/crm.controller';

const router = Router();

// Customers
router.get('/customers', getCustomers);
router.get('/customers/:id', getCustomerById);
router.post('/customers', createCustomer);
router.put('/customers/:id', updateCustomer);
router.delete('/customers/:id', deleteCustomer);

// Interaction History
router.post('/customers/:customerId/interactions', addInteraction);
router.delete('/interactions/:id', deleteInteraction);

// Leads
router.get('/leads', getLeads);
router.get('/leads/:id', getLeadById);
router.post('/leads', createLead);
router.post('/leads/:id/calculate-score', calculateScore);
router.post('/leads/:id/convert', convertToCustomer);
router.post('/leads/:id/mark-lost', markLost);
router.delete('/leads/:id', deleteLead);

// Sales Pipeline
router.get('/pipelines', getPipelines);
router.post('/pipelines', createPipeline);
router.put('/pipelines/:id/advance-stage', advanceStage);
router.delete('/pipelines/:id', deletePipeline);

// Sales Reports
router.get('/reports', getReports);
router.post('/reports', createReport);
router.delete('/reports/:id', deleteReport);

export default router;