import React, { useState, useMemo } from 'react';
import { 
  CalendarRange, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Filter, 
  User, 
  Lock,
  ChevronDown,
  X,
  ShieldCheck,
  Building
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { LeaveRequest } from '../types';
import { motion, AnimatePresence } from 'motion/react';

const LEAVE_TYPES = [
  { value: 'VACATION', label: 'Vacation Leave' },
  { value: 'SICK', label: 'Sick Leave' },
  { value: 'PERSONAL', label: 'Personal Leave' },
  { value: 'MATERNITY', label: 'Maternity Leave (Routes to HR)' },
  { value: 'UNPAID', label: 'Unpaid Leave (Routes to HR)' },
  { value: 'EXTENDED', label: 'Extended Leave (Routes to HR)' },
  { value: 'LEGAL', label: 'Legal Leave (Routes to HR)' },
  { value: 'OTHER', label: 'Other Leave' },
];

export default function LeaveRequestsView() {
  const { 
    leaveRequests, 
    addLeaveRequest, 
    updateLeaveRequestStatus, 
    employees, 
    currentEmployeeId,
    hasPermission
  } = useApp();

  const canApprove = hasPermission('leave', 'approve');

  // Modal / form visibility state
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form states
  const [leaveType, setLeaveType] = useState('VACATION');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');

  // Status Filter state
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'denied'>('all');

  const processedRequests = useMemo(() => {
    return leaveRequests.filter(req => {
      return statusFilter === 'all' || req.status === statusFilter;
    });
  }, [leaveRequests, statusFilter]);

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!startDate || !endDate) {
      setFormError('Please select both start and end dates.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setFormError('Start date must be on or before the end date.');
      return;
    }
    if (!reason.trim()) {
      setFormError('Please provide a reason for your leave request.');
      return;
    }

    addLeaveRequest({
      employeeId: currentEmployeeId,
      type: leaveType,
      startDate,
      endDate,
      reason: reason.trim()
    });

    setStartDate('');
    setEndDate('');
    setReason('');
    setLeaveType('VACATION');
    setIsFormOpen(false);
  };

  const renderStatusBadge = (status: LeaveRequest['status']) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Approved
          </span>
        );
      case 'denied':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Denied
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-lg animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Pending Review
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-gray-50/40 min-h-full">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 tracking-tight">Leave Requests</h1>
          <p className="text-xs text-gray-500 mt-1">
            Dynamic approval routing engine: Employee → Manager → Admin (or HR for special leaves).
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-medium text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer shrink-0 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Request Leave
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-gray-200/80 shadow-xs">
        <div className="flex items-center gap-1 p-1 bg-gray-100/70 border border-gray-200/50 rounded-xl overflow-x-auto">
          {(['all', 'pending', 'approved', 'denied'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === tab 
                  ? 'bg-white text-indigo-600 shadow-xs' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab === 'all' ? 'All Requests' : tab}
            </button>
          ))}
        </div>
        <span className="text-xs font-mono text-gray-400 px-2">Total: {processedRequests.length} records</span>
      </div>

      {/* Leave Request List */}
      <div className="space-y-4">
        {processedRequests.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-gray-200/80 space-y-2">
            <CalendarRange className="w-8 h-8 text-gray-300 mx-auto" />
            <p className="text-xs text-gray-500 font-medium">No leave requests found matching filter.</p>
          </div>
        ) : (
          processedRequests.map((req) => (
            <div
              key={req.id}
              className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-xs hover:border-gray-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold flex items-center justify-center text-xs shrink-0">
                    {req.employeeName ? req.employeeName[0] : 'U'}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{req.employeeName}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-gray-100 text-gray-600 font-mono">
                        {req.type}
                      </span>
                      {req.approverName && (
                        <span className="text-[10px] text-indigo-600 font-medium flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Approver: {req.approverName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-gray-600 font-medium pl-11 space-y-1">
                  <p className="text-gray-700">"{req.reason}"</p>
                  <p className="text-[11px] font-mono text-gray-400">
                    Dates: {req.startDate} → {req.endDate} • Requested on: {req.requestDate}
                  </p>
                </div>
              </div>

              <div className="flex flex-row md:flex-col items-end justify-between md:justify-center gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100">
                {renderStatusBadge(req.status)}

                {canApprove && req.status === 'pending' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateLeaveRequestStatus(req.id, 'approved')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => updateLeaveRequestStatus(req.id, 'denied')}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-rose-50 hover:text-rose-600 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Deny
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal for Creating Leave Request */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <CalendarRange className="w-5 h-5 text-indigo-600" />
                Submit Leave Request
              </h2>
              <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitRequest} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Leave Type *</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  {LEAVE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Reason *</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="State the reason for your leave request..."
                  rows={3}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors cursor-pointer shadow-md"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
