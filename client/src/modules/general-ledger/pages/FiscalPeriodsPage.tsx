import React, { useState, useEffect, useCallback } from 'react';
import { CalendarRange, Plus, X, Lock, Unlock } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import * as glApi from '../api';
import type { FiscalPeriod } from '../types';
import { fmtDate } from '../format';

export default function FiscalPeriodsPage() {
  const { hasPermission, showToast } = useApp();
  const canManage = hasPermission('general_ledger', 'manage_fiscal_periods');
  const canOverride = hasPermission('general_ledger', 'override_closed_period');

  const [periods, setPeriods] = useState<FiscalPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setPeriods(await glApi.fetchFiscalPeriods());
    } catch (err: any) {
      showToast(err.message || 'Failed to load fiscal periods', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const openCreate = () => { setName(''); setStartDate(''); setEndDate(''); setFormError(''); setFormOpen(true); };

  const submitCreate = async () => {
    setFormError('');
    if (!name.trim() || !startDate || !endDate) { setFormError('All fields are required'); return; }
    try {
      setSubmitting(true);
      await glApi.createFiscalPeriod({ name, startDate, endDate });
      showToast(`Fiscal period "${name}" created`, 'success');
      setFormOpen(false);
      load();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create fiscal period');
    } finally {
      setSubmitting(false);
    }
  };

  const close = async (id: string) => {
    try {
      setActingId(id);
      await glApi.closeFiscalPeriod(id);
      showToast('Fiscal period closed — new journal entries can no longer post to it', 'success');
      load();
    } catch (err: any) {
      showToast(err.message || 'Failed to close fiscal period', 'error');
    } finally {
      setActingId(null);
    }
  };

  const reopen = async (id: string) => {
    try {
      setActingId(id);
      await glApi.reopenFiscalPeriod(id);
      showToast('Fiscal period reopened (administrator override)', 'success');
      load();
    } catch (err: any) {
      showToast(err.message || 'Failed to reopen fiscal period', 'error');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><CalendarRange className="w-5 h-5" /></div>
          <div><h2 className="text-lg font-bold text-gray-900">Fiscal Periods</h2><p className="text-xs text-gray-500">Closing a period blocks new postings dated inside it; an administrator override can reopen it.</p></div>
        </div>
        {canManage && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer">
            <Plus className="w-4 h-4" /> New Period
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-400 text-sm bg-white rounded-2xl border border-gray-200">Loading...</div>
      ) : periods.length === 0 ? (
        <div className="p-12 text-center text-gray-400 text-sm bg-white rounded-2xl border border-gray-200">No fiscal periods defined yet — without one, posting is unrestricted by date.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-bold tracking-wider"><tr><th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Range</th><th className="text-left px-4 py-3">Status</th><th className="text-right px-4 py-3">Actions</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {periods.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/70">
                  <td className="px-4 py-3 font-semibold text-gray-800">{p.name}</td>
                  <td className="px-4 py-3">{fmtDate(p.startDate)} – {fmtDate(p.endDate)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${p.status === 'OPEN' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-gray-500/10 text-gray-600 border-gray-500/20'}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.status === 'OPEN' && canManage && (
                      <button disabled={actingId === p.id} onClick={() => close(p.id)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-800 rounded-lg text-[11px] font-semibold text-white hover:bg-gray-900 disabled:opacity-50 cursor-pointer">
                        <Lock className="w-3.5 h-3.5" /> Close
                      </button>
                    )}
                    {p.status === 'CLOSED' && canOverride && (
                      <button disabled={actingId === p.id} onClick={() => reopen(p.id)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50 cursor-pointer">
                        <Unlock className="w-3.5 h-3.5" /> Reopen (Override)
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">New Fiscal Period</h3>
              <button onClick={() => setFormOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-[11px] font-semibold text-gray-500">Name</label><input value={name} onChange={(e) => setName(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" placeholder="FY2026 Q3" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[11px] font-semibold text-gray-500">Start Date</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" /></div>
                <div><label className="text-[11px] font-semibold text-gray-500">End Date</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" /></div>
              </div>
              {formError && <p className="text-[11px] text-rose-600 font-semibold">{formError}</p>}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setFormOpen(false)} className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 cursor-pointer">Cancel</button>
              <button onClick={submitCreate} disabled={submitting} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer">{submitting ? 'Creating...' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
