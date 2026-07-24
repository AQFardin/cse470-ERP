import React, { useState, useEffect } from 'react';
import { ScrollText, Search, Shield, Filter, RefreshCw, ChevronDown, ChevronRight, User, Calendar, Tag } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { AuditLog } from '../types';
import * as api from '../lib/api';

export default function AuditLogView() {
  const { showToast } = useApp();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEntity, setFilterEntity] = useState<string>('ALL');
  const [searchActor, setSearchActor] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const data = await api.fetchAuditLogs({
        targetEntity: filterEntity !== 'ALL' ? filterEntity : undefined,
        limit: 100,
      });
      setLogs(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load audit logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [filterEntity]);

  const filteredLogs = logs.filter((log) => {
    if (searchActor && !log.actorName.toLowerCase().includes(searchActor.toLowerCase())) {
      return false;
    }
    return true;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">CREATE</span>;
      case 'UPDATE':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">UPDATE</span>;
      case 'DELETE':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">DELETE</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-500/10 text-gray-600 border border-gray-500/20">{action}</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-gray-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
            <ScrollText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display tracking-tight text-white">System Audit Trail</h1>
            <p className="text-xs text-indigo-200/80 mt-0.5">
              Comprehensive log of all administrative actions, data mutations, and security events.
            </p>
          </div>
        </div>
        <button
          onClick={loadAuditLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600/80 hover:bg-indigo-600 rounded-xl text-xs font-semibold text-white transition-all shadow-md cursor-pointer disabled:opacity-50 shrink-0 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Audit Trail
        </button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Filter by actor name..."
              value={searchActor}
              onChange={(e) => setSearchActor(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-medium text-gray-500">Entity:</span>
          <select
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Entities</option>
            <option value="Employee">Employee</option>
            <option value="LeaveRequest">LeaveRequest</option>
            <option value="TaskAssignment">TaskAssignment</option>
            <option value="OffboardRequest">OffboardRequest</option>
            <option value="LeaveBalance">LeaveBalance</option>
            <option value="AttendanceLog">AttendanceLog</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading audit logs...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No audit logs found matching criteria.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            <div className="grid grid-cols-12 px-6 py-3 bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              <div className="col-span-1"></div>
              <div className="col-span-3">Timestamp</div>
              <div className="col-span-3">Actor</div>
              <div className="col-span-2">Action</div>
              <div className="col-span-3">Target Entity</div>
            </div>

            {filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const dateStr = new Date(log.timestamp).toLocaleString();

              return (
                <div key={log.id} className="transition-colors hover:bg-gray-50/60">
                  <div
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="grid grid-cols-12 px-6 py-4 items-center text-xs text-gray-700 cursor-pointer select-none"
                  >
                    <div className="col-span-1 text-gray-400">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-indigo-600" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                    <div className="col-span-3 flex items-center gap-2 font-mono text-gray-600 text-[11px]">
                      <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      {dateStr}
                    </div>
                    <div className="col-span-3 font-semibold text-gray-900 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-bold flex items-center justify-center">
                        {log.actorName.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <span className="truncate">{log.actorName}</span>
                    </div>
                    <div className="col-span-2">{getActionBadge(log.action)}</div>
                    <div className="col-span-3 flex items-center gap-2 font-mono text-xs text-gray-700">
                      <Tag className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="font-semibold text-gray-900">{log.targetEntity}</span>
                      <span className="text-gray-400 text-[10px]">({log.targetId.slice(0, 8)}...)</span>
                    </div>
                  </div>

                  {/* Expanded Snapshot JSON View */}
                  {isExpanded && (
                    <div className="px-6 py-4 bg-slate-900 text-slate-100 border-t border-slate-800 space-y-3 font-mono text-[11px] rounded-b-xl mx-4 mb-3">
                      <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                        <span>AUDIT EVENT SNAPSHOT DATA</span>
                        <span className="text-[10px] text-slate-500">ID: {log.id}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-amber-400 font-semibold mb-1">◀ BEFORE SNAPSHOT:</div>
                          <pre className="p-3 bg-slate-950 rounded-xl overflow-x-auto text-slate-300 border border-slate-800/80 max-h-48">
                            {log.beforeSnapshot ? JSON.stringify(log.beforeSnapshot, null, 2) : 'null'}
                          </pre>
                        </div>
                        <div>
                          <div className="text-emerald-400 font-semibold mb-1">▶ AFTER SNAPSHOT:</div>
                          <pre className="p-3 bg-slate-950 rounded-xl overflow-x-auto text-slate-300 border border-slate-800/80 max-h-48">
                            {log.afterSnapshot ? JSON.stringify(log.afterSnapshot, null, 2) : 'null'}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
