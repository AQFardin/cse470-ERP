import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ===================== MEMBERSHIP PLANS =====================

export const getPlans = async (req: Request, res: Response) => {
  try {
    const plans = await prisma.membershipPlan.findMany();
    res.json(plans);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const createPlan = async (req: Request, res: Response) => {
  try {
    const { name, tier, price, billingIntervalDays } = req.body as {
      name: string;
      tier: string;
      price: number;
      billingIntervalDays?: number;
    };
    const plan = await prisma.membershipPlan.create({
      data: { name, tier, price, billingIntervalDays: billingIntervalDays || 30 }
    });
    res.status(201).json(plan);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ===================== SUBSCRIPTIONS =====================

export const getSubscriptions = async (req: Request, res: Response) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      include: { customer: true, plan: true, billingCycles: true, renewalNotices: true }
    });
    res.json(subscriptions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const createSubscription = async (req: Request, res: Response) => {
  try {
    const { customerId, planId, startDate } = req.body as {
      customerId: string;
      planId: string;
      startDate?: string;
    };
    const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
    if (!plan) {
      res.status(404).json({ error: 'Plan not found' });
      return;
    }

    const subscription = await prisma.subscription.create({
      data: {
        customerId,
        planId,
        startDate: new Date(startDate || Date.now()),
        billingCycles: {
          create: {
            billingDate: new Date(startDate || Date.now()),
            amount: plan.price,
            status: 'PAID'
          }
        }
      },
      include: { customer: true, plan: true, billingCycles: true }
    });
    res.status(201).json(subscription);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const cancelSubscription = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const subscription = await prisma.subscription.update({
      where: { id },
      data: { status: 'CANCELLED', autoRenew: false }
    });
    res.json(subscription);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Plan upgrade/downgrade with prorated billing
export const changePlan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { newPlanId } = req.body as { newPlanId: string };

    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: { plan: true, billingCycles: { orderBy: { billingDate: 'desc' }, take: 1 } }
    });
    if (!subscription) {
      res.status(404).json({ error: 'Subscription not found' });
      return;
    }

    const newPlan = await prisma.membershipPlan.findUnique({ where: { id: newPlanId } });
    if (!newPlan) {
      res.status(404).json({ error: 'New plan not found' });
      return;
    }

    // Proration: days remaining in the current cycle * daily price difference
    const lastCycle = subscription.billingCycles[0];
    const cycleStart = lastCycle ? new Date(lastCycle.billingDate) : new Date(subscription.startDate);
    const intervalDays = subscription.plan.billingIntervalDays;
    const daysElapsed = Math.max(0, Math.floor((Date.now() - cycleStart.getTime()) / (1000 * 60 * 60 * 24)));
    const daysRemaining = Math.max(0, intervalDays - daysElapsed);

    const oldDailyRate = Number(subscription.plan.price) / intervalDays;
    const newDailyRate = Number(newPlan.price) / newPlan.billingIntervalDays;
    const proratedAmount = (newDailyRate - oldDailyRate) * daysRemaining;

    const [, planChange] = await prisma.$transaction([
      prisma.subscription.update({ where: { id }, data: { planId: newPlanId } }),
      prisma.subscriptionPlanChange.create({
        data: {
          subscriptionId: id,
          fromPlanId: subscription.planId,
          toPlanId: newPlanId,
          proratedAmount
        }
      })
    ]);

    res.json({ proratedAmount, planChange });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ===================== BILLING CYCLES =====================

export const recordBillingCycle = async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params as { subscriptionId: string };
    const { amount, status } = req.body as { amount: number; status?: string };
    const cycle = await prisma.billingCycle.create({
      data: {
        subscriptionId,
        billingDate: new Date(),
        amount,
        status: status || 'PENDING'
      }
    });

    // If a payment fails, flag the subscription as past due
    if (status === 'FAILED') {
      await prisma.subscription.update({ where: { id: subscriptionId }, data: { status: 'PAST_DUE' } });
    }

    res.status(201).json(cycle);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ===================== RENEWAL NOTICES =====================

export const createRenewalNotice = async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params as { subscriptionId: string };
    const { noticeType, renewalDate } = req.body as { noticeType: string; renewalDate: string };
    const notice = await prisma.renewalNotice.create({
      data: {
        subscriptionId,
        noticeType,
        sentDate: new Date(),
        renewalDate: new Date(renewalDate)
      }
    });
    res.status(201).json(notice);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};