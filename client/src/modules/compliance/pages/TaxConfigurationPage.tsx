import React, { useState, useEffect, useCallback } from 'react';
import { Settings2, Plus, X, CalendarClock } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import * as complianceApi from '../api';
import type { TaxCode, TaxType, TaxCategory } from '../types';
import { fmtDate } from '../../general-ledger/format';

const CATEGORY_BADGE: Record<TaxCategory, string> = {
  STANDARD: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
  REDUCED: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  ZERO_RATED: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  EXEMPT: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  OUT_OF_SCOPE: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
};

const TAX_TYPES: TaxType[] = ['VAT', 'GST', 'SALES_TAX', 'SERVICE_TAX', 'OTHER'];
const TAX_CATEGORIES: TaxCategory[] = ['STANDARD', 'REDUCED', 'ZERO_RATED', 'EXEMPT', 'OUT_OF_SCOPE'];

export default function TaxConfigurationPage() {
  const { hasPermission, showToast } = useApp();
  const canManageConfig = hasPermission('compliance', 'manage_tax_configuration');
  const canManageRates = hasPermission('compliance', 'manage_tax_rates');

  const [taxCodes, setTaxCodes] = useState<TaxCode[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setTaxCodes(await complianceApi.fetchTaxCodes());
    } catch (err: any) {
      showToast(err.message || 'Failed to load tax codes', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  // ─── Create tax code form ────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<TaxType>('VAT');
  const [category, setCategory] = useState<TaxCategory>('STANDARD');
  const [region, setRegion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const openCreate = () => {
    setName(''); setCode(''); setType('VAT'); setCategory('STANDARD'); setRegion(''); setFormError(''); setFormOpen(true);
  };

  const submitCreate = async () => {
    setFormError('');
    if (!name.trim() || !code.trim()) { setFormError('Name and code are required'); return; }
    try {
      setSubmitting(true);
      await complianceApi.createTaxCode({ name, code, type, category, region: region || undefined });
      showToast(`Tax code "${code}" created`, 'success');
      setFormOpen(false);
      load();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create tax code');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Add rate form ────────────────────────────────────────
  const [rateForTaxCode, setRateForTaxCode] = useState<TaxCode | null>(null);
  const [ratePercent, setRatePercent] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [rateError, setRateError] = useState('');
  const [rateSubmitting, setRateSubmitting] = useState(false);

  const openAddRate = (tc: TaxCode) => {
    setRateForTaxCode(tc); setRatePercent(''); setEffectiveFrom(''); setEffectiveTo(''); setRateError('');
  };

  const submitRate = async () => {
    if (!rateForTaxCode) return;
    setRateError('');
    if (!ratePercent || !effectiveFrom) { setRateError('Rate percent and effective-from date are required'); return; }
    try {
      setRateSubmitting(true);
      await complianceApi.createTaxRate(rateForTaxCode.id, { ratePercent: Number(ratePercent), effectiveFrom, effectiveTo: effectiveTo || null });
      showToast('Tax rate added', 'success');
      setRateForTaxCode(null);
      load();
    } catch (err: any) {
      setRateError(err.message || 'Failed to add tax rate');
    } finally {
      setRateSubmitting(false);
    }
  };

  const toggleActive = async (tc: TaxCode) => {
    try {
      await complianceApi.updateTaxCode(tc.id, { isActive: !tc.isActive });
      showToast(`Tax code "${tc.code}" ${tc.isActive ? 'deactivated' : 'activated'}`, 'success');
      load();
    } catch (err: any) {
      showToast(err.message || 'Failed to update tax code', 'error');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center"><Settings2 className="w-5 h-5" /></div>
          <div><h2 className="text-lg font-bold text-gray-900">Tax Configuration</h2><p className="text-xs text-gray-500">Tax codes and effective-dated rates. ZERO_RATED and EXEMPT are tracked separately.</p></div>
        </div>
        {canManageConfig && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 transition-colors cursor-pointer">
            <Plus className="w-4 h-4" /> New Tax Code
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-400 text-sm bg-white rounded-2xl border border-gray-200">Loading...</div>
      ) : taxCodes.length === 0 ? (
        <div className="p-12 text-center text-gray-400 text-sm bg-white rounded-2xl border border-gray-200">No tax codes configured yet.</div>
      ) : (
        <div className="space-y-3">
          {taxCodes.map((tc) => (
            <div key={tc.id} className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-gray-800">{tc.code}</span>
                    <span className="text-sm font-semibold text-gray-900">{tc.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${CATEGORY_BADGE[tc.category]}`}>{tc.category.replace('_', ' ')}</span>
                    {!tc.isActive && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-gray-500/10 text-gray-500 border-gray-500/20">INACTIVE</span>}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">{tc.type}{tc.region ? ` · ${tc.region}` : ''}</p>
                </div>
                {canManageConfig && (
                  <div className="flex gap-2">
                    {canManageRates && tc.category !== 'EXEMPT' && tc.category !== 'OUT_OF_SCOPE' && (
                      <button onClick={() => openAddRate(tc)} className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-semibold text-gray-700 hover:bg-gray-100 cursor-pointer">
                        <CalendarClock className="w-3.5 h-3.5" /> Add Rate
                      </button>
                    )}
                    <button onClick={() => toggleActive(tc)} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-semibold text-gray-700 hover:bg-gray-100 cursor-pointer">
                      {tc.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                )}
              </div>

              {tc.rates.length > 0 && (
                <table className="w-full text-xs mt-4">
                  <thead className="text-gray-400 uppercase text-[10px] font-bold tracking-wider border-b border-gray-100">
                    <tr><th className="text-left py-1.5">Rate</th><th className="text-left py-1.5">Effective From</th><th className="text-left py-1.5">Effective To</th><th className="text-left py-1.5">Status</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {tc.rates.map((r) => (
                      <tr key={r.id}>
                        <td className="py-1.5 font-mono font-semibold">{r.ratePercent}%</td>
                        <td className="py-1.5">{fmtDate(r.effectiveFrom)}</td>
                        <td className="py-1.5">{r.effectiveTo ? fmtDate(r.effectiveTo) : '—'}</td>
                        <td className="py-1.5">{r.isActive ? <span className="text-emerald-600 font-semibold">Active</span> : <span className="text-gray-400">Inactive</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">New Tax Code</h3>
              <button onClick={() => setFormOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-[11px] font-semibold text-gray-500">Name</label><input value={name} onChange={(e) => setName(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" placeholder="Standard VAT" /></div>
              <div><label className="text-[11px] font-semibold text-gray-500">Code</label><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono" placeholder="VAT15" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[11px] font-semibold text-gray-500">Type</label>
                  <select value={type} onChange={(e) => setType(e.target.value as TaxType)} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs">
                    {TAX_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className="text-[11px] font-semibold text-gray-500">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value as TaxCategory)} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs">
                    {TAX_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="text-[11px] font-semibold text-gray-500">Region (optional)</label><input value={region} onChange={(e) => setRegion(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" placeholder="BD" /></div>
              {formError && <p className="text-[11px] text-rose-600 font-semibold">{formError}</p>}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setFormOpen(false)} className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 cursor-pointer">Cancel</button>
              <button onClick={submitCreate} disabled={submitting} className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 disabled:opacity-50 cursor-pointer">{submitting ? 'Creating...' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {rateForTaxCode && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Add Rate — {rateForTaxCode.code}</h3>
              <button onClick={() => setRateForTaxCode(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-[11px] font-semibold text-gray-500">Rate (%)</label><input type="number" step="0.01" value={ratePercent} onChange={(e) => setRatePercent(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" placeholder="15" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[11px] font-semibold text-gray-500">Effective From</label><input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" /></div>
                <div><label className="text-[11px] font-semibold text-gray-500">Effective To (optional)</label><input type="date" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" /></div>
              </div>
              {rateError && <p className="text-[11px] text-rose-600 font-semibold">{rateError}</p>}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setRateForTaxCode(null)} className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 cursor-pointer">Cancel</button>
              <button onClick={submitRate} disabled={rateSubmitting} className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 disabled:opacity-50 cursor-pointer">{rateSubmitting ? 'Adding...' : 'Add Rate'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
