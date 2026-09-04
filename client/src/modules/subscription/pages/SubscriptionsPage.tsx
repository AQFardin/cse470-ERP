import { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { useSubscription } from '../context/SubscriptionContext';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-gray-100 text-gray-500 border-gray-200',
  PAST_DUE: 'bg-red-50 text-red-700 border-red-200',
  EXPIRED: 'bg-gray-100 text-gray-500 border-gray-200',
};

export default function SubscriptionsPage() {
  const { currentUserRole } = useApp();
  const { plans, subscriptions, isLoading, addPlan, addSubscription, cancelSub, changeSubPlan, recordBilling, sendRenewalNotice } = useSubscription();

  const [planForm, setPlanForm] = useState({ name: '', tier: '', price: '', billingIntervalDays: '30' });
  const [subForm, setSubForm] = useState({ customerId: '', planId: '' });
  const [changePlanTarget, setChangePlanTarget] = useState<Record<string, string>>({});

  if (currentUserRole !== 'manager') {
    return <div className="p-8 text-center text-gray-500">You don't have access to manage subscriptions.</div>;
  }

  async function handleAddPlan(e: React.FormEvent) {
    e.preventDefault();
    await addPlan({
      name: planForm.name,
      tier: planForm.tier,
      price: Number(planForm.price),
      billingIntervalDays: Number(planForm.billingIntervalDays) || 30,
    });
    setPlanForm({ name: '', tier: '', price: '', billingIntervalDays: '30' });
  }

  async function handleAddSubscription(e: React.FormEvent) {
    e.preventDefault();
    if (!subForm.customerId || !subForm.planId) return;
    await addSubscription(subForm);
    setSubForm({ customerId: '', planId: '' });
  }

  async function handleChangePlan(subId: string) {
    const newPlanId = changePlanTarget[subId];
    if (!newPlanId) return;
    await changeSubPlan(subId, newPlanId);
  }

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Subscriptions & Membership</h1>
        <p className="text-sm text-gray-500 mt-1">Manage plans, billing cycles, and renewals</p>
      </div>

      {/* Membership Plans */}
      <section>
        <h2 className="font-medium text-sm text-gray-600 mb-3">Membership Plans</h2>
        <form onSubmit={handleAddPlan} className="border border-gray-200 rounded-lg p-4 space-y-3 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="Plan name" value={planForm.name}
              onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
              required className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
            <input type="text" placeholder="Tier (e.g. Basic, Pro)" value={planForm.tier}
              onChange={(e) => setPlanForm({ ...planForm, tier: e.target.value })}
              required className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" step="0.01" placeholder="Price" value={planForm.price}
              onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
              required className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
            <input type="number" placeholder="Billing interval (days)" value={planForm.billingIntervalDays}
              onChange={(e) => setPlanForm({ ...planForm, billingIntervalDays: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium">Add plan</button>
        </form>
        <div className="flex gap-2 flex-wrap">
          {plans.map((p) => (
            <span key={p.id} className="text-xs bg-gray-100 px-3 py-1.5 rounded-full">
              {p.name} ({p.tier}) — ${p.price}/{p.billingIntervalDays}d
            </span>
          ))}
        </div>
      </section>

      {/* Subscriptions */}
      <section>
        <h2 className="font-medium text-sm text-gray-600 mb-3">Subscribe a customer</h2>
        <form onSubmit={handleAddSubscription} className="flex gap-2 mb-6">
          <input type="text" placeholder="Customer ID" value={subForm.customerId}
            onChange={(e) => setSubForm({ ...subForm, customerId: e.target.value })}
            required className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm" />
          <select value={subForm.planId} onChange={(e) => setSubForm({ ...subForm, planId: e.target.value })}
            required className="border border-gray-300 rounded-md px-3 py-2 text-sm">
            <option value="">Select plan</option>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium">Subscribe</button>
        </form>

        <h2 className="font-medium text-sm text-gray-600 mb-3">Active subscriptions</h2>
        {isLoading && <p className="text-gray-400 text-sm">Loading...</p>}
        <div className="space-y-3">
          {subscriptions.map((sub) => (
            <div key={sub.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium">{sub.customer?.name || sub.customerId}</p>
                  <p className="text-sm text-gray-500">{sub.plan?.name} · Started {new Date(sub.startDate).toLocaleDateString()}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_COLORS[sub.status] || ''}`}>
                  {sub.status}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 items-center mb-3">
                <select
                  value={changePlanTarget[sub.id] || ''}
                  onChange={(e) => setChangePlanTarget({ ...changePlanTarget, [sub.id]: e.target.value })}
                  className="text-xs border border-gray-300 rounded-md px-2 py-1"
                >
                  <option value="">Change to plan...</option>
                  {plans.filter((p) => p.id !== sub.planId).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <button onClick={() => handleChangePlan(sub.id)} className="text-xs bg-gray-100 px-3 py-1 rounded-md">
                  Apply (prorated)
                </button>

                <button
                  onClick={() => recordBilling(sub.id, { amount: Number(sub.plan?.price || 0), status: 'PAID' })}
                  className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1 rounded-md"
                >
                  Record payment
                </button>
                <button
                  onClick={() => recordBilling(sub.id, { amount: Number(sub.plan?.price || 0), status: 'FAILED' })}
                  className="text-xs bg-red-50 text-red-700 px-3 py-1 rounded-md"
                >
                  Record failed payment
                </button>

                <button
                  onClick={() => sendRenewalNotice(sub.id, { noticeType: 'UPCOMING_RENEWAL', renewalDate: new Date(Date.now() + 7 * 86400000).toISOString() })}
                  className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-md"
                >
                  Send renewal notice
                </button>

                {sub.status !== 'CANCELLED' && (
                  <button onClick={() => cancelSub(sub.id)} className="text-xs text-red-500 underline ml-auto">
                    Cancel subscription
                  </button>
                )}
              </div>

              {sub.billingCycles?.length > 0 && (
                <div className="text-xs text-gray-500">
                  Last billed: ${sub.billingCycles[0].amount} on {new Date(sub.billingCycles[0].billingDate).toLocaleDateString()} ({sub.billingCycles[0].status})
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}