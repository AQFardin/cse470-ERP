import React, { useState, useEffect } from 'react';
import { Wallet, Edit3, ShieldAlert, CheckCircle2, User, RefreshCw, Filter, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { LeaveBalance } from '../types';
import * as api from '../lib/api';

export default function LeaveBalanceView() {
  const { currentEmployeeId, currentUser, hasPermission, showToast } = useApp();
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [myBalances, setMyBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmployee, setSearchEmployee] = useState('');

  // Correction modal state
  const [editBalanceItem, setEditBalanceItem] = useState<LeaveBalance | null>(null);
  const [newBalance, setNewBalance] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canCorrect = hasPermission('leave', 'correct_balance');

  const loadBalances = async () => {
    try {
      setLoading(true);
      if (currentEmployeeId) {
        const myData = await api.fetchEmployeeLeaveBalances(currentEmployeeId);
        setMyBalances(myData);
      }

      if (canCorrect) {
        const allData = await api.fetchAllLeaveBalances();
        setBalances(allData);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch leave balances', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBalances();
  }, [currentEmployeeId, canCorrect]);

  const handleCorrectBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBalanceItem || newBalance < 0 || !reason) {
      showToast('Please specify a valid balance and correction reason', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await api.correctLeaveBalanceAPI(editBalanceItem.id, newBalance, reason);
      showToast(`Corrected ${editBalanceItem.leaveType} balance for employee`, 'success');
      setEditBalanceItem(null);
      setReason('');
      loadBalances();
    } catch (err: any) {
      showToast(err.message || 'Failed to correct balance', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredBalances = balances.filter((b) => {
    if (!b.employee) return true;
    const name = `${b.employee.firstName} ${b.employee.lastName}`.toLowerCase();
    if (searchEmployee && !name.includes(searchEmployee.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display tracking-tight text-white">Leave Balances & Entitlements</h1>
            <p className="text-xs text-emerald-200/80 mt-0.5">
              Annual leave quota tracking, type-based balances, and HR administrative correction ledger.
            </p>
          </div>
        </div>
        <button
          onClick={loadBalances}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-semibold text-white transition-all shadow-md cursor-pointer disabled:opacity-50 shrink-0 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Balances
        </button>
      </div>

      {/* Personal Leave Balances */}
      <div>
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">My Annual Leave Quotas ({new Date().getFullYear()})</h2>
        {myBalances.length === 0 ? (
          <div className="p-6 bg-white rounded-2xl border border-gray-200 text-center text-gray-400 text-xs">
            No personal leave balances found for current user.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {myBalances.map((b) => (
              <div key={b.id} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2 shadow-xs hover:border-emerald-300 transition-all">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{b.leaveType}</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-gray-900 font-mono">{b.balance}</span>
                  <span className="text-xs text-gray-500 font-medium">days left</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* HR Admin Table for All Employee Balances */}
      {canCorrect && (
        <div className="space-y-4 pt-4 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
              HR Balance Management Ledger ({balances.length} records)
            </h2>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search employee..."
                value={searchEmployee}
                onChange={(e) => setSearchEmployee(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-400 text-xs">Loading all balances...</div>
            ) : filteredBalances.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">No records found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      <th className="px-6 py-3">Employee</th>
                      <th className="px-6 py-3">Department</th>
                      <th className="px-6 py-3">Leave Type</th>
                      <th className="px-6 py-3">Remaining Balance</th>
                      <th className="px-6 py-3 text-right">HR Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                    {filteredBalances.map((b) => (
                      <tr key={b.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-6 py-3.5 font-semibold text-gray-900">
                          {b.employee ? `${b.employee.firstName} ${b.employee.lastName}` : 'Unknown'}
                          <span className="ml-2 text-[10px] text-gray-400 font-mono">({b.employee?.employeeId})</span>
                        </td>
                        <td className="px-6 py-3.5 uppercase font-mono text-[11px] text-gray-500">
                          {b.employee?.department || '-'}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                            {b.leaveType}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 font-bold font-mono text-gray-900">
                          {b.balance} days
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <button
                            onClick={() => {
                              setEditBalanceItem(b);
                              setNewBalance(b.balance);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Correct
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Correct Balance Modal */}
      {editBalanceItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl border border-gray-100">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-emerald-600" />
              Correct Leave Balance
            </h2>
            <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-600 space-y-1">
              <p><strong>Employee:</strong> {editBalanceItem.employee?.firstName} {editBalanceItem.employee?.lastName}</p>
              <p><strong>Leave Type:</strong> {editBalanceItem.leaveType}</p>
              <p><strong>Current Balance:</strong> {editBalanceItem.balance} days</p>
            </div>

            <form onSubmit={handleCorrectBalance} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">New Balance (days) *</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={newBalance}
                  onChange={(e) => setNewBalance(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Correction Reason (Required for Audit Trail) *</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. HR adjustment, rollover policy, error correction..."
                  rows={3}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditBalanceItem(null)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save & Log Audit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
