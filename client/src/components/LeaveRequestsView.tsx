import React, { useState, useMemo } from 'react';
import { 
  CalendarRange, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Filter, 
  Sparkles, 
  ShieldAlert, 
  User, 
  Trash2,
  Lock,
  ChevronDown,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { LeaveRequest } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export default function LeaveRequestsView() {
  const { 
    currentUserRole, 
    leaveRequests, 
    addLeaveRequest, 
    updateLeaveRequestStatus, 
    employees, 
    currentEmployeeId 
  } = useApp();

  const me = employees.find(e => e.id === currentEmployeeId);

  // Modal / form visibility state
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form states (employee only)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');

  // Status Filter state (manager only)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'denied'>('all');

  // Filtered requests based on view and filters
  const processedRequests = useMemo(() => {
    if (currentUserRole === 'manager') {
      return leaveRequests.filter(req => {
        return statusFilter === 'all' || req.status === statusFilter;
      });
    } else {
      // Employee view gets only their own requests
      return leaveRequests.filter(req => req.employeeId === currentEmployeeId);
    }
  }, [leaveRequests, currentUserRole, statusFilter, currentEmployeeId]);

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

    // Submit leave request
    addLeaveRequest({
      employeeId: currentEmployeeId,
      type: 'OTHER',
      startDate,
      endDate,
      reason: reason.trim()
    });

    // Reset Form
    setStartDate('');
    setEndDate('');
    setReason('');
    setIsFormOpen(false);
  };

  // Badge render helpers
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-rose-500 bg-rose-50 border border-rose-200 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Denied
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Pending
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-gray-50/40 min-h-full relative">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 tracking-tight">Leave Requests</h1>
          <p className="text-xs text-gray-500 mt-1">
            {currentUserRole === 'manager' 
              ? 'Oversee workplace bandwidth, manage team availability schedules, and review time-off requests.' 
              : 'Submit and track your paid and unpaid leave schedule records.'}
          </p>
        </div>

        {/* Action Button */}
        {currentUserRole === 'employee' && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer scale-100 active:scale-[0.98] self-start md:self-auto"
          >
            <Plus className="w-4 h-4" /> Request Leave
          </button>
        )}
      </div>

      {/* Filter and stats navigation bar */}
      {currentUserRole === 'manager' ? (
        <div className="border-b border-gray-200 flex items-center justify-between gap-4 overflow-x-auto select-none no-scrollbar pb-px">
          <div className="flex gap-2 min-w-max">
            {(['all', 'pending', 'approved', 'denied'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer capitalize ${
                  statusFilter === filter 
                    ? 'border-indigo-600 text-indigo-600 font-bold' 
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {filter === 'all' ? 'All Requests' : `${filter} Requests`}
              </button>
            ))}
          </div>
          <div className="text-[11px] text-gray-400 font-medium hidden sm:block">
            Showing {processedRequests.length} of {leaveRequests.length} logs
          </div>
        </div>
      ) : (
        <div className="bg-indigo-50/60 border border-indigo-100/50 p-4 rounded-xl flex items-center gap-3 text-xs text-indigo-800">
          <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
          <span>Need to submit a vacation, medical leave, or personal time off? Click the <strong>"Request Leave"</strong> action button.</span>
        </div>
      )}

      {/* Table grid of records */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        {processedRequests.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mb-3">
              <CalendarRange className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold text-gray-800">No leave requests found</span>
            <span className="text-xs text-gray-400 mt-1">There are currently no records listed under this view.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-200 select-none text-gray-400 font-bold uppercase tracking-wider">
                  {currentUserRole === 'manager' && <th className="py-3 px-6 font-bold">Employee</th>}
                  <th className="py-3 px-6 font-bold">Time-off Dates</th>
                  <th className="py-3 px-6 font-bold">Reason</th>
                  <th className="py-3 px-6 font-bold">Submitted Date</th>
                  <th className="py-3 px-6 font-bold">Status</th>
                  {currentUserRole === 'manager' && <th className="py-3 px-6 text-right font-bold">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {processedRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50/40 transition-all">
                    {/* Employee name (manager only) */}
                    {currentUserRole === 'manager' && (
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 text-sm">{req.employeeName}</span>
                          <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider mt-0.5">{req.employeeId}</span>
                        </div>
                      </td>
                    )}

                    {/* Dates */}
                    <td className="py-4 px-6 text-gray-700 font-bold font-mono">
                      {req.startDate} <span className="text-gray-400 font-sans font-normal mx-1">to</span> {req.endDate}
                    </td>

                    {/* Reason */}
                    <td className="py-4 px-6 text-gray-500 max-w-sm font-normal">
                      {req.reason}
                    </td>

                    {/* Submission Date */}
                    <td className="py-4 px-6 text-gray-400 font-mono">
                      {req.requestDate}
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-6">
                      {renderStatusBadge(req.status)}
                    </td>

                    {/* Approve/Deny Actions (manager only) */}
                    {currentUserRole === 'manager' && (
                      <td className="py-4 px-6 text-right">
                        {req.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5 select-none">
                            <button
                              onClick={() => updateLeaveRequestStatus(req.id, 'approved')}
                              className="px-2.5 py-1.5 border border-emerald-200 text-emerald-600 bg-emerald-50/50 hover:bg-emerald-50 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => updateLeaveRequestStatus(req.id, 'denied')}
                              className="px-2.5 py-1.5 border border-rose-200 text-rose-500 bg-rose-50/50 hover:bg-rose-50 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Deny
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Resolved</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-over Panel for Creating a New Request (Employee Only) */}
      <AnimatePresence>
        {isFormOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="fixed inset-0 bg-black z-40 backdrop-blur-xs"
            />

            {/* Slide-over panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase font-mono tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> System Dispatch
                  </span>
                  <h2 className="text-lg font-display font-bold text-gray-900 mt-0.5">Submit Leave Request</h2>
                </div>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmitRequest} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Info Card */}
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Requestor Details</span>
                  <p className="font-bold text-gray-800">{me ? me.name : 'Financial Analyst'}</p>
                  <p className="text-[10px] text-gray-400 font-mono">{me ? me.id : 'EMP001'} &bull; {me ? me.role : 'Analyst'}</p>
                </div>

                {/* Start Date */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Leave Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* End Date */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Leave End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Reason */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Reason for absence</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                    placeholder="Describe why you need time off (e.g. medical procedure, family trip, moving houses)..."
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 resize-none"
                  />
                </div>

                {/* Footer Buttons */}
                <div className="pt-6 border-t border-gray-100 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="flex-1 py-2.5 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-semibold text-gray-500 transition-colors cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer text-center"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
