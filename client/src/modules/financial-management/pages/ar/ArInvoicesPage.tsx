import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FileSpreadsheet, Plus, Search, Eye, Pencil, Trash2, Send, Ban, Wallet, X, ChevronLeft, ChevronRight, Undo2 } from 'lucide-react';
import { useApp } from '../../../../context/AppContext';
import { useGeneralLedger } from '../../../general-ledger/context/GeneralLedgerContext';
import { useFinancialManagement } from '../../context/FinancialManagementContext';
import * as finApi from '../../api';
import type { CustomerInvoice, ArInvoiceStatus, PaymentMethod } from '../../types';
import { fmtMoney, fmtDate } from '../../../general-ledger/format';

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  ISSUED: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  PARTIALLY_PAID: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  PAID: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  CANCELLED: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
};

interface ItemDraft { description: string; quantity: string; unitPrice: string; }
const emptyItem = (): ItemDraft => ({ description: '', quantity: '1', unitPrice: '' });

export default function ArInvoicesPage() {
  const { hasPermission, showToast } = useApp();
  const { activeAccounts } = useGeneralLedger();
  const { customers } = useFinancialManagement();
  const revenueAccounts = activeAccounts.filter((a) => a.type === 'REVENUE');
  const bankAccounts = activeAccounts.filter((a) => a.type === 'ASSET');

  const canCreate = hasPermission('ar', 'create_invoice');
  const canEdit = hasPermission('ar', 'edit_invoice');
  const canIssue = hasPermission('ar', 'issue_invoice');
  const canCancel = hasPermission('ar', 'cancel_invoice');
  const canPay = hasPermission('ar', 'create_payment');
  const canReversePayment = hasPermission('ar', 'reverse_payment');

  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | ArInvoiceStatus>('ALL');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await finApi.fetchCustomerInvoices({ status: statusFilter, search: search || undefined, page, pageSize: 15 });
      setInvoices(res.invoices);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      showToast(err.message || 'Failed to load customer invoices', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page, showToast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [statusFilter, search]);

  // ─── Create / Edit form ─────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [revenueAccountId, setRevenueAccountId] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [taxAmount, setTaxAmount] = useState('0');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);
    const tax = Number(taxAmount) || 0;
    const discount = Number(discountAmount) || 0;
    return { subtotal, tax, discount, total: subtotal + tax - discount };
  }, [items, taxAmount, discountAmount]);

  const openCreate = () => {
    setEditingId(null); setCustomerId(''); setInvoiceDate(new Date().toISOString().split('T')[0]); setDueDate('');
    setRevenueAccountId(''); setReferenceNumber(''); setTaxAmount('0'); setDiscountAmount('0'); setNotes(''); setItems([emptyItem()]);
    setFormError(''); setFormOpen(true);
  };

  const openEdit = (invoice: CustomerInvoice) => {
    setEditingId(invoice.id); setCustomerId(invoice.customerId); setInvoiceDate(fmtDate(invoice.invoiceDate)); setDueDate(fmtDate(invoice.dueDate));
    setRevenueAccountId(invoice.revenueAccountId); setReferenceNumber(invoice.referenceNumber || ''); setTaxAmount(String(invoice.taxAmount)); setDiscountAmount(String(invoice.discountAmount));
    setNotes(invoice.notes || ''); setItems(invoice.items.map((i) => ({ description: i.description, quantity: String(i.quantity), unitPrice: String(i.unitPrice) })));
    setFormError(''); setFormOpen(true);
  };

  const updateItem = (idx: number, patch: Partial<ItemDraft>) => setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (idx: number) => setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));

  const submitInvoice = async () => {
    setFormError('');
    if (!customerId) { setFormError('Customer is required'); return; }
    if (!dueDate) { setFormError('Due date is required'); return; }
    if (!revenueAccountId) { setFormError('Revenue account is required'); return; }
    const payloadItems = items.filter((i) => i.description.trim() && Number(i.unitPrice) >= 0).map((i) => ({ description: i.description, quantity: Number(i.quantity) || 1, unitPrice: Number(i.unitPrice) || 0 }));
    if (payloadItems.length === 0) { setFormError('At least one line item is required'); return; }

    try {
      setSubmitting(true);
      const payload = { customerId, invoiceDate, dueDate, referenceNumber: referenceNumber || undefined, revenueAccountId, taxAmount: Number(taxAmount) || 0, discountAmount: Number(discountAmount) || 0, notes: notes || undefined, items: payloadItems };
      const invoice = editingId ? await finApi.updateCustomerInvoice(editingId, payload) : await finApi.createCustomerInvoice(payload);
      showToast(`Invoice ${invoice.invoiceNumber} saved`, 'success');
      setFormOpen(false);
      load();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save invoice');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Detail modal ───────────────────────────────────────
  const [detail, setDetail] = useState<CustomerInvoice | null>(null);
  const openDetail = async (id: string) => {
    try { setDetail(await finApi.fetchCustomerInvoice(id)); } catch (err: any) { showToast(err.message || 'Failed to load invoice', 'error'); }
  };
  const refreshDetail = async () => { if (detail) setDetail(await finApi.fetchCustomerInvoice(detail.id)); };

  const handleIssue = async (inv: CustomerInvoice) => {
    if (!confirm(`Issue invoice ${inv.invoiceNumber}? This posts it to the General Ledger and it can no longer be freely edited.`)) return;
    try { await finApi.issueCustomerInvoice(inv.id); showToast(`${inv.invoiceNumber} issued and posted`, 'success'); load(); refreshDetail(); } catch (err: any) { showToast(err.message, 'error'); }
  };
  const handleCancel = async (inv: CustomerInvoice) => {
    if (!confirm(`Cancel invoice ${inv.invoiceNumber}?`)) return;
    try { await finApi.cancelCustomerInvoice(inv.id); showToast(`${inv.invoiceNumber} cancelled`, 'success'); load(); refreshDetail(); } catch (err: any) { showToast(err.message, 'error'); }
  };
  const handleDelete = async (inv: CustomerInvoice) => {
    if (!confirm(`Delete draft invoice ${inv.invoiceNumber}?`)) return;
    try { await finApi.deleteCustomerInvoice(inv.id); showToast('Draft invoice deleted', 'info'); setDetail(null); load(); } catch (err: any) { showToast(err.message, 'error'); }
  };

  // ─── Payment modal ──────────────────────────────────────
  const [payModalInvoice, setPayModalInvoice] = useState<CustomerInvoice | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [payBankAccountId, setPayBankAccountId] = useState('');
  const [payRef, setPayRef] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payError, setPayError] = useState('');

  const openPay = (inv: CustomerInvoice) => {
    setPayModalInvoice(inv);
    setPayAmount((Number(inv.totalAmount) - Number(inv.paidAmount)).toFixed(2));
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayBankAccountId(''); setPayRef(''); setPayError('');
  };

  const submitPayment = async () => {
    if (!payModalInvoice) return;
    setPayError('');
    if (!payBankAccountId) { setPayError('Deposit account is required'); return; }
    const amount = Number(payAmount);
    if (!(amount > 0)) { setPayError('Payment amount must be greater than zero'); return; }
    try {
      setPaySubmitting(true);
      const payment = await finApi.createCustomerPayment({ customerInvoiceId: payModalInvoice.id, amount, paymentDate: payDate, paymentMethod: payMethod, bankAccountId: payBankAccountId, referenceNumber: payRef || undefined });
      showToast(`Payment ${payment.paymentNumber} recorded`, 'success');
      setPayModalInvoice(null); load(); refreshDetail();
    } catch (err: any) {
      setPayError(err.message || 'Failed to record payment');
    } finally {
      setPaySubmitting(false);
    }
  };

  const handleReversePayment = async (paymentId: string, paymentNumber: string) => {
    if (!confirm(`Reverse payment ${paymentNumber}?`)) return;
    try { await finApi.reverseCustomerPayment(paymentId); showToast(`Payment ${paymentNumber} reversed`, 'success'); load(); refreshDetail(); } catch (err: any) { showToast(err.message, 'error'); }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-950 via-blue-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0"><FileSpreadsheet className="w-6 h-6" /></div>
          <div><h1 className="text-xl font-bold font-display tracking-tight text-white">Customer Invoices</h1><p className="text-xs text-blue-200/80 mt-0.5">Draft, issue, and collect money owed by customers.</p></div>
        </div>
        {canCreate && <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all cursor-pointer shrink-0"><Plus className="w-4 h-4" /> New Invoice</button>}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoice # or reference..." className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer">
          <option value="ALL">All Statuses</option><option value="DRAFT">Draft</option><option value="ISSUED">Issued</option><option value="PARTIALLY_PAID">Partially Paid</option><option value="PAID">Paid</option><option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading customer invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No customer invoices found.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
              <tr><th className="text-left px-4 py-3">Invoice #</th><th className="text-left px-4 py-3">Customer</th><th className="text-left px-4 py-3">Due Date</th><th className="text-right px-4 py-3">Total</th><th className="text-right px-4 py-3">Outstanding</th><th className="text-left px-4 py-3">Status</th><th className="text-right px-4 py-3">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv) => {
                const outstanding = Number(inv.totalAmount) - Number(inv.paidAmount);
                return (
                  <tr key={inv.id} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3 font-mono font-semibold text-gray-800">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-gray-700">{inv.customer.name}</td>
                    <td className="px-4 py-3 text-gray-600">{fmtDate(inv.dueDate)}{inv.isOverdue && <span className="ml-1.5 text-[10px] font-bold text-red-600">OVERDUE</span>}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmtMoney(inv.totalAmount)}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">{fmtMoney(outstanding)}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_BADGE[inv.status]}`}>{inv.status.replace('_', ' ')}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openDetail(inv.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer" title="View"><Eye className="w-3.5 h-3.5" /></button>
                        {inv.status === 'DRAFT' && canEdit && <button onClick={() => openEdit(inv)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>}
                        {inv.status === 'DRAFT' && canIssue && <button onClick={() => handleIssue(inv)} className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer" title="Issue"><Send className="w-3.5 h-3.5" /></button>}
                        {(inv.status === 'ISSUED' || inv.status === 'PARTIALLY_PAID') && canPay && <button onClick={() => openPay(inv)} className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer" title="Record payment"><Wallet className="w-3.5 h-3.5" /></button>}
                        {(inv.status === 'DRAFT' || inv.status === 'ISSUED') && canCancel && <button onClick={() => handleCancel(inv)} className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer" title="Cancel"><Ban className="w-3.5 h-3.5" /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{total} invoices · page {page} of {totalPages}</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 cursor-pointer"><ChevronLeft className="w-3.5 h-3.5" /></button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 cursor-pointer"><ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-3xl space-y-4 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-blue-600" />{editingId ? 'Edit Draft Invoice' : 'New Customer Invoice'}</h2>
              <button onClick={() => setFormOpen(false)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            {formError && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-xs font-medium">{formError}</div>}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Customer *</label>
                <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} disabled={!!editingId} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs cursor-pointer disabled:opacity-60">
                  <option value="">Select customer...</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.customerId} — {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Revenue Account *</label>
                <select value={revenueAccountId} onChange={(e) => setRevenueAccountId(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs cursor-pointer">
                  <option value="">Select account...</option>
                  {revenueAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </select>
              </div>
              <div><label className="block font-semibold text-gray-700 mb-1">Invoice Date *</label><input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs" /></div>
              <div><label className="block font-semibold text-gray-700 mb-1">Due Date *</label><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs" /></div>
              <div className="col-span-2"><label className="block font-semibold text-gray-700 mb-1">Reference Number</label><input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs" /></div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block font-semibold text-gray-700 text-xs">Line Items *</label>
                <button type="button" onClick={addItem} className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer">+ Add Item</button>
              </div>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold"><tr><th className="text-left px-3 py-2 w-1/2">Description</th><th className="text-right px-3 py-2 w-20">Qty</th><th className="text-right px-3 py-2 w-28">Unit Price</th><th className="text-right px-3 py-2 w-28">Amount</th><th className="w-8"></th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="px-2 py-1.5"><input value={it.description} onChange={(e) => updateItem(idx, { description: e.target.value })} className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs" /></td>
                        <td className="px-2 py-1.5"><input type="number" min="0" step="1" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: e.target.value })} className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-right" /></td>
                        <td className="px-2 py-1.5"><input type="number" min="0" step="0.01" value={it.unitPrice} onChange={(e) => updateItem(idx, { unitPrice: e.target.value })} className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-right" /></td>
                        <td className="px-3 py-1.5 text-right font-mono">{fmtMoney((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0))}</td>
                        <td className="px-1">{items.length > 1 && <button type="button" onClick={() => removeItem(idx)} className="p-1 text-gray-300 hover:text-rose-500 cursor-pointer"><X className="w-3.5 h-3.5" /></button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><label className="block font-semibold text-gray-700 mb-1">Tax Amount</label><input type="number" min="0" step="0.01" value={taxAmount} onChange={(e) => setTaxAmount(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs" /></div>
              <div><label className="block font-semibold text-gray-700 mb-1">Discount Amount</label><input type="number" min="0" step="0.01" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs" /></div>
              <div className="col-span-2"><label className="block font-semibold text-gray-700 mb-1">Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs" /></div>
            </div>

            <div className="rounded-xl p-4 bg-gray-50 border border-gray-200 text-xs font-semibold flex flex-wrap gap-x-6 gap-y-1">
              <span>Subtotal: <span className="font-mono">৳{fmtMoney(totals.subtotal)}</span></span>
              <span>Tax: <span className="font-mono">৳{fmtMoney(totals.tax)}</span></span>
              <span>Discount: <span className="font-mono">৳{fmtMoney(totals.discount)}</span></span>
              <span className="text-gray-900">Total: <span className="font-mono">৳{fmtMoney(totals.total)}</span></span>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button type="button" onClick={() => setFormOpen(false)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors cursor-pointer">Cancel</button>
              <button type="button" disabled={submitting} onClick={submitInvoice} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50">{submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Create Invoice'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl space-y-4 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div><h2 className="text-base font-bold text-gray-900 font-mono">{detail.invoiceNumber}</h2><p className="text-xs text-gray-500 mt-0.5">{detail.customer.name}</p></div>
              <button onClick={() => setDetail(null)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <span className={`px-2.5 py-1 rounded-full font-semibold border ${STATUS_BADGE[detail.status]}`}>{detail.status.replace('_', ' ')}</span>
              <span className="text-gray-500">Invoice: {fmtDate(detail.invoiceDate)}</span>
              <span className="text-gray-500">Due: {fmtDate(detail.dueDate)}</span>
              {detail.isOverdue && <span className="text-[10px] font-bold text-red-600">OVERDUE</span>}
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold"><tr><th className="text-left px-3 py-2">Description</th><th className="text-right px-3 py-2">Qty</th><th className="text-right px-3 py-2">Unit Price</th><th className="text-right px-3 py-2">Amount</th></tr></thead>
                <tbody className="divide-y divide-gray-100">{detail.items.map((i) => (<tr key={i.id}><td className="px-3 py-2">{i.description}</td><td className="px-3 py-2 text-right">{i.quantity}</td><td className="px-3 py-2 text-right font-mono">{fmtMoney(i.unitPrice)}</td><td className="px-3 py-2 text-right font-mono">{fmtMoney(i.amount)}</td></tr>))}</tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 rounded-xl p-3">
              <span>Subtotal: <span className="font-mono">{fmtMoney(detail.subtotal)}</span></span>
              <span>Tax: <span className="font-mono">{fmtMoney(detail.taxAmount)}</span></span>
              <span>Discount: <span className="font-mono">{fmtMoney(detail.discountAmount)}</span></span>
              <span className="font-bold">Total: <span className="font-mono">{fmtMoney(detail.totalAmount)}</span></span>
              <span>Paid: <span className="font-mono">{fmtMoney(detail.paidAmount)}</span></span>
              <span className="font-bold">Outstanding: <span className="font-mono">{fmtMoney(Number(detail.totalAmount) - Number(detail.paidAmount))}</span></span>
            </div>

            {detail.payments && detail.payments.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-gray-700 mb-2">Payments</h3>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold"><tr><th className="text-left px-3 py-2">Payment #</th><th className="text-left px-3 py-2">Date</th><th className="text-right px-3 py-2">Amount</th><th className="text-left px-3 py-2">Status</th><th className="w-8"></th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {detail.payments.map((p) => (
                        <tr key={p.id}>
                          <td className="px-3 py-2 font-mono">{p.paymentNumber}</td>
                          <td className="px-3 py-2">{fmtDate(p.paymentDate)}</td>
                          <td className="px-3 py-2 text-right font-mono">{fmtMoney(p.amount)}</td>
                          <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${p.status === 'REVERSED' ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'}`}>{p.status}</span></td>
                          <td className="px-2">{p.status === 'POSTED' && canReversePayment && <button onClick={() => handleReversePayment(p.id, p.paymentNumber)} title="Reverse" className="p-1 text-gray-400 hover:text-amber-600 cursor-pointer"><Undo2 className="w-3.5 h-3.5" /></button>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 flex-wrap">
              {detail.status === 'DRAFT' && canEdit && <button onClick={() => { setDetail(null); openEdit(detail); }} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl cursor-pointer"><Pencil className="w-3.5 h-3.5" /> Edit</button>}
              {detail.status === 'DRAFT' && canEdit && <button onClick={() => handleDelete(detail)} className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl cursor-pointer"><Trash2 className="w-3.5 h-3.5" /> Delete</button>}
              {detail.status === 'DRAFT' && canIssue && <button onClick={() => handleIssue(detail)} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl cursor-pointer"><Send className="w-3.5 h-3.5" /> Issue</button>}
              {(detail.status === 'ISSUED' || detail.status === 'PARTIALLY_PAID') && canPay && <button onClick={() => openPay(detail)} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl cursor-pointer"><Wallet className="w-3.5 h-3.5" /> Record Payment</button>}
              {(detail.status === 'DRAFT' || detail.status === 'ISSUED') && canCancel && <button onClick={() => handleCancel(detail)} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl cursor-pointer"><Ban className="w-3.5 h-3.5" /> Cancel</button>}
            </div>
          </div>
        </div>
      )}

      {/* Payment modal */}
      {payModalInvoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2"><Wallet className="w-5 h-5 text-emerald-600" />Record Payment — {payModalInvoice.invoiceNumber}</h2>
              <button onClick={() => setPayModalInvoice(null)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            {payError && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-xs font-medium">{payError}</div>}
            <p className="text-xs text-gray-500">Outstanding: <span className="font-mono font-bold text-gray-800">৳{fmtMoney(Number(payModalInvoice.totalAmount) - Number(payModalInvoice.paidAmount))}</span></p>
            <div className="space-y-3 text-xs">
              <div><label className="block font-semibold text-gray-700 mb-1">Amount *</label><input type="number" min="0.01" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs" /></div>
              <div><label className="block font-semibold text-gray-700 mb-1">Payment Date *</label><input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs" /></div>
              <div><label className="block font-semibold text-gray-700 mb-1">Payment Method *</label>
                <select value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethod)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs cursor-pointer">
                  <option value="CASH">Cash</option><option value="BANK_TRANSFER">Bank Transfer</option><option value="CHEQUE">Cheque</option><option value="CARD">Card</option><option value="MOBILE_PAYMENT">Mobile Payment</option><option value="OTHER">Other</option>
                </select>
              </div>
              <div><label className="block font-semibold text-gray-700 mb-1">Deposit To Account *</label>
                <select value={payBankAccountId} onChange={(e) => setPayBankAccountId(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs cursor-pointer">
                  <option value="">Select account...</option>
                  {bankAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </select>
              </div>
              <div><label className="block font-semibold text-gray-700 mb-1">Reference Number</label><input value={payRef} onChange={(e) => setPayRef(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs" /></div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button type="button" onClick={() => setPayModalInvoice(null)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors cursor-pointer">Cancel</button>
              <button type="button" disabled={paySubmitting} onClick={submitPayment} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50">{paySubmitting ? 'Recording...' : 'Record Payment'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
