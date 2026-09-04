import React, { useState, useEffect } from 'react';
import { UserMinus, Plus, CheckCircle2, XCircle, Clock, AlertTriangle, Calendar, User, FileText, Filter } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { OffboardRequest } from '../types';
import * as api from '../lib/api';

export default function OffboardingView() {
  const { employees, hasPermission, showToast, refreshData } = useApp();
  const [requests, setRequests] = useState<OffboardRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [modalOpen, setModalOpen] = useState(false);

  // New request form state
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [reason, setReason] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canRequest = hasPermission('offboarding', 'request');
  const canReview = hasPermission('offboarding', 'execute');

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await api.fetchOffboardRequests();
      setRequests(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load offboarding requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId || !reason || !effectiveDate) {
      showToast('Please fill in all fields', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await api.createOffboardRequestAPI({
        employeeId: selectedEmpId,
        reason,
        effectiveDate,
      });
      showToast('Offboarding request submitted for HR review', 'success');
      setModalOpen(false);
      setSelectedEmpId('');
      setReason('');
      setEffectiveDate('');
      loadRequests();
    } catch (err: any) {
      showToast(err.message || 'Failed to create request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.reviewOffboardRequestAPI(id, status);
      showToast(`Offboarding request ${status.toLowerCase()}`, status === 'APPROVED' ? 'success' : 'warning');
      loadRequests();
      refreshData();
    } catch (err: any) {
      showToast(err.message || 'Failed to review request', 'error');
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20"><Clock className="w-3.5 h-3.5" /> PENDING REVIEW</span>;
      case 'APPROVED':
      case 'COMPLETED':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"><CheckCircle2 className="w-3.5 h-3.5" /> OFFBOARDED</span>;
      case 'REJECTED':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20"><XCircle className="w-3.5 h-3.5" /> REJECTED</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-300 shrink-0">
            <UserMinus className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display tracking-tight text-white">Employee Offboarding</h1>
            <p className="text-xs text-rose-200/80 mt-0.5">
              Structured offboarding workflows, HR exit approvals, and automated account deactivation.
            </p>
          </div>
        </div>

        {canRequest && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 rounded-xl text-xs font-semibold text-white transition-all shadow-lg shadow-rose-600/30 cursor-pointer shrink-0 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            Initiate Offboarding
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-medium text-gray-500">Filter Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending HR Review</option>
            <option value="COMPLETED">Completed Offboarding</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <span className="text-xs text-gray-400 font-mono">Total Requests: {filteredRequests.length}</span>
      </div>

      {/* Request Grid */}
      {loading ? (
        <div className="p-12 text-center text-gray-400 text-sm">Loading offboarding requests...</div>
      ) : filteredRequests.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-gray-200 text-center text-gray-400 text-sm">
          No offboarding requests found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRequests.map((req) => (
            <div key={req.id} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4 shadow-xs hover:border-gray-300 transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 text-rose-600 font-bold flex items-center justify-center text-xs shrink-0">
                    {req.employee.firstName[0]}
                    {req.employee.lastName[0]}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{req.employee.firstName} {req.employee.lastName}</h3>
                    <p className="text-xs text-gray-400 font-mono">{req.employee.employeeId} • {req.employee.department}</p>
                  </div>
                </div>
                {getStatusBadge(req.status)}
              </div>

              <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-600 space-y-1.5 border border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center gap-1"><User className="w-3.5 h-3.5" /> Requested by:</span>
                  <span className="font-semibold text-gray-800">{req.requestedByName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Effective Date:</span>
                  <span className="font-semibold text-rose-600 font-mono">{new Date(req.effectiveDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-start gap-1 pt-1 border-t border-gray-200/60">
                  <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                  <span className="text-gray-700 italic">"{req.reason}"</span>
                </div>
              </div>

              {/* Action Buttons for HR */}
              {canReview && req.status === 'PENDING' && (
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => handleReview(req.id, 'APPROVED')}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Deactivate
                  </button>
                  <button
                    onClick={() => handleReview(req.id, 'REJECTED')}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gray-100 hover:bg-rose-50 hover:text-rose-600 text-gray-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject Request
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal for Requesting Offboard */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl border border-gray-100">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <UserMinus className="w-5 h-5 text-rose-600" />
              Initiate Employee Offboarding
            </h2>
            <form onSubmit={handleCreateRequest} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Select Employee *</label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-rose-500 cursor-pointer"
                  required
                >
                  <option value="">Choose an active employee...</option>
                  {employees
                    .filter((e) => e.status !== 'inactive')
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employeeId} - {emp.departmentId.toUpperCase()})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Effective Offboarding Date *</label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-rose-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Reason for Offboarding *</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Resignation, end of contract, performance..."
                  rows={3}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-rose-500"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
