import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, Undo2 } from 'lucide-react';
import { useApp } from '../../../../context/AppContext';
import * as finApi from '../../api';
import type { CustomerPayment, PaymentRecordStatus } from '../../types';
import { fmtMoney, fmtDate } from '../../../general-ledger/format';

export default function ArPaymentsPage() {
  const { hasPermission, showToast } = useApp();
  const canReverse = hasPermission('ar', 'reverse_payment');
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | PaymentRecordStatus>('ALL');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await finApi.fetchCustomerPayments({ status: statusFilter, pageSize: 50 });
      setPayments(res.payments);
    } catch (err: any) {
      showToast(err.message || 'Failed to load customer payments', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, showToast]);

  useEffect(() => { load(); }, [load]);

  const handleReverse = async (id: string, paymentNumber: string) => {
    if (!confirm(`Reverse payment ${paymentNumber}?`)) return;
    try { await finApi.reverseCustomerPayment(id); showToast(`${paymentNumber} reversed`, 'success'); load(); } catch (err: any) { showToast(err.message, 'error'); }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4 bg-gradient-to-r from-blue-950 via-blue-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0"><Wallet className="w-6 h-6" /></div>
        <div><h1 className="text-xl font-bold font-display tracking-tight text-white">Customer Payments</h1><p className="text-xs text-blue-200/80 mt-0.5">Every payment posted against a customer invoice.</p></div>
      </div>

      <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <span className="text-xs font-medium text-gray-500">Status:</span>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer">
          <option value="ALL">All</option><option value="POSTED">Posted</option><option value="REVERSED">Reversed</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading payments...</div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No payments found.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
              <tr><th className="text-left px-4 py-3">Payment #</th><th className="text-left px-4 py-3">Invoice #</th><th className="text-left px-4 py-3">Customer</th><th className="text-left px-4 py-3">Date</th><th className="text-right px-4 py-3">Amount</th><th className="text-left px-4 py-3">Method</th><th className="text-left px-4 py-3">Status</th><th className="w-10"></th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/70">
                  <td className="px-4 py-3 font-mono font-semibold">{p.paymentNumber}</td>
                  <td className="px-4 py-3 font-mono text-gray-600">{p.customerInvoice?.invoiceNumber}</td>
                  <td className="px-4 py-3">{p.customerInvoice?.customer.name}</td>
                  <td className="px-4 py-3 text-gray-600">{fmtDate(p.paymentDate)}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmtMoney(p.amount)}</td>
                  <td className="px-4 py-3 text-gray-500">{p.paymentMethod.replace('_', ' ')}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${p.status === 'REVERSED' ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'}`}>{p.status}</span></td>
                  <td className="px-2">{p.status === 'POSTED' && canReverse && <button onClick={() => handleReverse(p.id, p.paymentNumber)} title="Reverse" className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 cursor-pointer"><Undo2 className="w-3.5 h-3.5" /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
