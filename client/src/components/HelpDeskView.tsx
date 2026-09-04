import React, { useState, useEffect } from 'react';
import { LifeBuoy, Plus, CheckCircle2, Clock, AlertCircle, Filter, User, Tag, ShieldCheck, RefreshCw, MessageSquare } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Ticket } from '../types';
import * as api from '../lib/api';

export default function HelpDeskView() {
  const { currentUser, hasPermission, showToast } = useApp();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [modalOpen, setModalOpen] = useState(false);

  // New Ticket form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'INTERNAL_IT' | 'MANAGER_ASSIST' | 'CUSTOMER_SUPPORT'>('INTERNAL_IT');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [submitting, setSubmitting] = useState(false);

  const canResolve = hasPermission('ticket', 'resolve');

  const loadTickets = async () => {
    try {
      setLoading(true);
      const data = await api.fetchTickets({
        category: filterCategory !== 'ALL' ? filterCategory : undefined,
        status: filterStatus !== 'ALL' ? filterStatus : undefined,
      });
      setTickets(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load tickets', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [filterCategory, filterStatus]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      showToast('Please provide a title and description', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await api.createTicketAPI({ title, description, category, priority });
      showToast('Ticket submitted successfully', 'success');
      setModalOpen(false);
      setTitle('');
      setDescription('');
      loadTickets();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit ticket', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await api.updateTicketAPI(id, { status });
      showToast(`Ticket status updated to ${status.replace('_', ' ')}`, 'success');
      loadTickets();
    } catch (err: any) {
      showToast(err.message || 'Failed to update ticket status', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">OPEN</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">IN PROGRESS</span>;
      case 'RESOLVED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">RESOLVED</span>;
      case 'CLOSED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-500/10 text-gray-600 border border-gray-500/20">CLOSED</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'INTERNAL_IT':
        return <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">INTERNAL IT</span>;
      case 'MANAGER_ASSIST':
        return <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">MANAGER ASSIST</span>;
      case 'CUSTOMER_SUPPORT':
        return <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">CUSTOMER SUPPORT</span>;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-950 via-cyan-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shrink-0">
            <LifeBuoy className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display tracking-tight text-white">Help Desk & Support Ticketing</h1>
            <p className="text-xs text-cyan-200/80 mt-0.5">
              Category routing (Internal IT vs Support), ticket assignments, and resolution tracking.
            </p>
          </div>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-cyan-600/30 transition-all cursor-pointer shrink-0 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Raise Support Ticket
        </button>
      </div>

      {/* Category Lane Selector & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-medium text-gray-500">Ticket Category:</span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            <option value="INTERNAL_IT">Internal IT</option>
            <option value="MANAGER_ASSIST">Manager Assistance</option>
            <option value="CUSTOMER_SUPPORT">Customer Support</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      {loading ? (
        <div className="p-12 text-center text-gray-400 text-sm">Loading tickets...</div>
      ) : tickets.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-gray-200 text-center text-gray-400 text-sm">
          No support tickets found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3 shadow-xs hover:border-cyan-300 transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getCategoryBadge(ticket.category)}
                    <span className="text-[10px] font-mono text-gray-400">ID: {ticket.id.slice(0, 8)}</span>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">{ticket.title}</h3>
                </div>
                {getStatusBadge(ticket.status)}
              </div>

              <p className="text-xs text-gray-600 italic bg-gray-50 p-3 rounded-xl border border-gray-100">
                "{ticket.description}"
              </p>

              <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  <span>Raised by: <strong>{ticket.raisedByName}</strong></span>
                </div>
                {ticket.assignedToName && (
                  <div className="flex items-center gap-1.5 text-indigo-600 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Assigned: {ticket.assignedToName}</span>
                  </div>
                )}
              </div>

              {/* Status Action Buttons */}
              {canResolve && ticket.status !== 'CLOSED' && (
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  {ticket.status === 'OPEN' && (
                    <button
                      onClick={() => handleUpdateStatus(ticket.id, 'IN_PROGRESS')}
                      className="flex-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Start Progress
                    </button>
                  )}
                  {ticket.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => handleUpdateStatus(ticket.id, 'RESOLVED')}
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Mark Resolved
                    </button>
                  )}
                  {ticket.status === 'RESOLVED' && (
                    <button
                      onClick={() => handleUpdateStatus(ticket.id, 'CLOSED')}
                      className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Close Ticket
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal for Raising Ticket */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl border border-gray-100">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-cyan-600" />
              Raise Help Desk Ticket
            </h2>
            <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Ticket Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-cyan-500 cursor-pointer"
                  required
                >
                  <option value="INTERNAL_IT">Internal IT (Hardware / Network / Access)</option>
                  <option value="MANAGER_ASSIST">Manager Assistance (Requisitions / Approvals)</option>
                  <option value="CUSTOMER_SUPPORT">Customer Support (External Client Inquiries)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Ticket Title *</label>
                <input
                  type="text"
                  placeholder="e.g. VPN Access Issue, Requisition Request..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Priority Level</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-cyan-500 cursor-pointer"
                >
                  <option value="LOW">Low Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="HIGH">High Priority</option>
                  <option value="URGENT">Urgent Priority</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Detailed Description *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue or request in detail..."
                  rows={3}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-cyan-500"
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
                  className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
