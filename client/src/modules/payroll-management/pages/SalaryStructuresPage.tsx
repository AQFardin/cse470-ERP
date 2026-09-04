import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, Plus, X } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { usePayroll } from '../context/PayrollContext';
import * as payrollApi from '../api';
import type { EmployeeSalary } from '../types';
import { fmtMoney, fmtDate } from '../../general-ledger/format';

interface ComponentDraft { salaryComponentId: string; amount: string }

export default function SalaryStructuresPage() {
  const { employees, hasPermission, showToast } = useApp();
  const { activeAllowanceComponents } = usePayroll();
  const canManage = hasPermission('payroll', 'manage_salary_structure');

  const activeEmployees = employees.filter((e) => e.status !== 'inactive');
  const [employeeId, setEmployeeId] = useState('');
  const [history, setHistory] = useState<EmployeeSalary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!employeeId && activeEmployees.length > 0) setEmployeeId(activeEmployees[0].id); }, [activeEmployees, employeeId]);

  const loadHistory = useCallback(async () => {
    if (!employeeId) return;
    try {
      setLoading(true);
      setHistory(await payrollApi.fetchEmployeeSalaryHistory(employeeId));
    } catch (err: any) {
      showToast(err.message || 'Failed to load salary history', 'error');
    } finally {
      setLoading(false);
    }
  }, [employeeId, showToast]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const [formOpen, setFormOpen] = useState(false);
  const [basicSalary, setBasicSalary] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [components, setComponents] = useState<ComponentDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const openForm = () => {
    setBasicSalary('');
    setEffectiveFrom(new Date().toISOString().split('T')[0]);
    setNotes('');
    setComponents(activeAllowanceComponents.map((c) => ({ salaryComponentId: c.id, amount: '' })));
    setFormError('');
    setFormOpen(true);
  };

  const submit = async () => {
    setFormError('');
    const basic = Number(basicSalary);
    if (!(basic > 0)) { setFormError('Basic salary must be greater than zero'); return; }
    try {
      setSubmitting(true);
      await payrollApi.assignEmployeeSalary(employeeId, {
        basicSalary: basic,
        effectiveFrom,
        notes: notes || undefined,
        components: components.filter((c) => Number(c.amount) > 0).map((c) => ({ salaryComponentId: c.salaryComponentId, amount: Number(c.amount) })),
      });
      showToast('Salary structure assigned', 'success');
      setFormOpen(false);
      loadHistory();
    } catch (err: any) {
      setFormError(err.message || 'Failed to assign salary');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-violet-950 via-violet-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center text-violet-300 shrink-0"><Wallet className="w-6 h-6" /></div>
          <div><h1 className="text-xl font-bold font-display tracking-tight text-white">Salary Structures</h1><p className="text-xs text-violet-200/80 mt-0.5">Effective-dated salary assignments — a new version never edits history.</p></div>
        </div>
        {canManage && <button onClick={openForm} className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-600/30 transition-all cursor-pointer shrink-0"><Plus className="w-4 h-4" /> Assign New Salary</button>}
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer">
          {activeEmployees.map((e) => <option key={e.id} value={e.id}>{e.employeeId} — {e.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading...</div>
        ) : history.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No salary has been assigned to this employee yet.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
              <tr><th className="text-left px-4 py-3">Effective From</th><th className="text-right px-4 py-3">Basic Salary</th><th className="text-left px-4 py-3">Allowances</th><th className="text-right px-4 py-3">Gross</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.map((s) => {
                const gross = Number(s.basicSalary) + s.components.reduce((sum, c) => sum + Number(c.amount), 0);
                return (
                  <tr key={s.id} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3 font-semibold text-gray-800">{fmtDate(s.effectiveFrom)}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmtMoney(s.basicSalary)}</td>
                    <td className="px-4 py-3 text-gray-600">{s.components.map((c) => `${c.salaryComponent.name}: ৳${fmtMoney(c.amount)}`).join(', ') || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">{fmtMoney(gross)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {formOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2"><Wallet className="w-5 h-5 text-violet-600" />Assign New Salary</h2>
              <button onClick={() => setFormOpen(false)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            {formError && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-xs font-medium">{formError}</div>}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><label className="block font-semibold text-gray-700 mb-1">Basic Salary *</label><input type="number" min="0.01" step="0.01" value={basicSalary} onChange={(e) => setBasicSalary(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs" /></div>
              <div><label className="block font-semibold text-gray-700 mb-1">Effective From *</label><input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs" /></div>
            </div>
            <div className="space-y-2">
              <label className="block font-semibold text-gray-700 text-xs">Allowances</label>
              {components.map((c, idx) => {
                const comp = activeAllowanceComponents.find((x) => x.id === c.salaryComponentId);
                return (
                  <div key={c.salaryComponentId} className="flex items-center gap-2 text-xs">
                    <span className="flex-1 text-gray-600">{comp?.name}</span>
                    <input type="number" min="0" step="0.01" value={c.amount} onChange={(e) => setComponents((prev) => prev.map((p, i) => (i === idx ? { ...p, amount: e.target.value } : p)))} placeholder="0" className="w-32 p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-right" />
                  </div>
                );
              })}
            </div>
            <div><label className="block font-semibold text-gray-700 mb-1 text-xs">Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs" /></div>
            <div className="flex items-center gap-2 pt-2">
              <button type="button" onClick={() => setFormOpen(false)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors cursor-pointer">Cancel</button>
              <button type="button" disabled={submitting} onClick={submit} className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50">{submitting ? 'Saving...' : 'Assign Salary'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
