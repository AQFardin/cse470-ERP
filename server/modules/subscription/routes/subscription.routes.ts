import { Router } from 'express';
import {
  getPlans,
  createPlan,
  getSubscriptions,
  createSubscription,
  cancelSubscription,
  changePlan,
  recordBillingCycle,
  createRenewalNotice
} from '../controllers/subscription.controller';

const router = Router();

// Membership Plans
router.get('/plans', getPlans);
router.post('/plans', createPlan);

// Subscriptions
router.get('/subscriptions', getSubscriptions);
router.post('/subscriptions', createSubscription);
router.patch('/subscriptions/:id/cancel', cancelSubscription);
router.patch('/subscriptions/:id/change-plan', changePlan);

// Billing Cycles
router.post('/subscriptions/:subscriptionId/billing', recordBillingCycle);

// Renewal Notices
router.post('/subscriptions/:subscriptionId/notices', createRenewalNotice);

export default router;