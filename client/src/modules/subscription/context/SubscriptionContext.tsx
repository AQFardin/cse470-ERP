import React, { createContext, useContext, useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import type { MembershipPlan, Subscription } from '../types';
import * as subApi from '../api';

interface SubscriptionContextType {
  plans: MembershipPlan[];
  subscriptions: Subscription[];
  isLoading: boolean;

  refreshAll: () => Promise<void>;
  addPlan: (data: { name: string; tier: string; price: number; billingIntervalDays?: number }) => Promise<void>;
  addSubscription: (data: { customerId: string; planId: string; startDate?: string }) => Promise<void>;
  cancelSub: (id: string) => Promise<void>;
  changeSubPlan: (id: string, newPlanId: string) => Promise<void>;
  recordBilling: (subscriptionId: string, data: { amount: number; status?: string }) => Promise<void>;
  sendRenewalNotice: (subscriptionId: string, data: { noticeType: string; renewalDate: string }) => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useApp();

  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAll = async () => {
    try {
      setIsLoading(true);
      const [p, s] = await Promise.all([subApi.fetchPlans(), subApi.fetchSubscriptions()]);
      setPlans(p);
      setSubscriptions(s);
    } catch (err: any) {
      showToast(err.message || 'Failed to load subscription data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const addPlan: SubscriptionContextType['addPlan'] = async (data) => {
    try {
      await subApi.createPlan(data);
      await refreshAll();
      showToast(`Plan "${data.name}" created`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const addSubscription: SubscriptionContextType['addSubscription'] = async (data) => {
    try {
      await subApi.createSubscription(data);
      await refreshAll();
      showToast('Subscription created', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const cancelSub = async (id: string) => {
    try {
      await subApi.cancelSubscription(id);
      await refreshAll();
      showToast('Subscription cancelled', 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const changeSubPlan = async (id: string, newPlanId: string) => {
    try {
      const result = await subApi.changePlan(id, newPlanId);
      await refreshAll();
      const amount = result.proratedAmount;
      showToast(
        `Plan changed. Prorated ${amount >= 0 ? 'charge' : 'credit'}: $${Math.abs(amount).toFixed(2)}`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const recordBilling: SubscriptionContextType['recordBilling'] = async (subscriptionId, data) => {
    try {
      await subApi.recordBillingCycle(subscriptionId, data);
      await refreshAll();
      showToast(data.status === 'FAILED' ? 'Payment failure recorded' : 'Billing cycle recorded', data.status === 'FAILED' ? 'warning' : 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const sendRenewalNotice: SubscriptionContextType['sendRenewalNotice'] = async (subscriptionId, data) => {
    try {
      await subApi.createRenewalNotice(subscriptionId, data);
      await refreshAll();
      showToast('Notice sent', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  return (
    <SubscriptionContext.Provider
      value={{ plans, subscriptions, isLoading, refreshAll, addPlan, addSubscription, cancelSub, changeSubPlan, recordBilling, sendRenewalNotice }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};