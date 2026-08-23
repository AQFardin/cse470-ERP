export interface MembershipPlan {
  id: string;
  name: string;
  tier: string;
  price: number;
  billingIntervalDays: number;
}

export interface BillingCycle {
  id: string;
  billingDate: string;
  amount: number;
  status: string;
}

export interface RenewalNotice {
  id: string;
  noticeType: string;
  sentDate: string;
  renewalDate: string;
}

export interface Subscription {
  id: string;
  startDate: string;
  status: string;
  autoRenew: boolean;
  customerId: string;
  customer: { id: string; name: string; email: string };
  planId: string;
  plan: MembershipPlan;
  billingCycles: BillingCycle[];
  renewalNotices: RenewalNotice[];
}