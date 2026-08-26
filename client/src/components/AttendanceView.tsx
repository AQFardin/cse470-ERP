import React, { useState, useEffect } from 'react';
import { Clock, Play, Square, Calendar, CheckCircle2, AlertCircle, Users, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { AttendanceLog } from '../types';
import * as api from '../lib/api';

export default function AttendanceView() {
  const { currentEmployeeId, hasPermission, showToast } = useApp();
  const [todayLog, setTodayLog] = useState<AttendanceLog | null>(null);
  const [personalLogs, setPersonalLogs] = useState<AttendanceLog[]>([]);
  const [teamCalendar, setTeamCalendar] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my' | 'team'>('my');

  const canViewTeam = hasPermission('attendance', 'view_team');

  const loadData = async () => {
    try {
      setLoading(true);
      const today = await api.fetchTodayAttendance();
      setTodayLog(today);

      if (currentEmployeeId) {
        const history = await api.fetchEmployeeAttendance(currentEmployeeId);
        setPersonalLogs(history);
      }

      if (canViewTeam) {
        const teamData = await api.fetchTeamAttendanceCalendar();
        setTeamCalendar(teamData);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load attendance data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentEmployeeId, canViewTeam]);

  const handleClockIn = async () => {
    try {
      await api.clockInAPI();
      showToast('Successfully clocked in!', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to clock in', 'error');
    }
  };

  const handleClockOut = async () => {
    try {
      await api.clockOutAPI();
      showToast('Successfully clocked out!', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to clock out', 'error');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display tracking-tight text-white">Attendance & Time Tracking</h1>
            <p className="text-xs text-blue-200/80 mt-0.5">
              Daily clock-in/out, shift recording, and team presence management.
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        {canViewTeam && (
          <div className="flex items-center bg-black/30 p-1 rounded-xl border border-white/10 shrink-0">
            <button
              onClick={() => setActiveTab('my')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'my' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-300 hover:text-white'
              }`}
            >
              My Attendance
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'team' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-300 hover:text-white'
              }`}
            >
              Team Calendar
            </button>
          </div>
        )}
      </div>

      {activeTab === 'my' ? (
        <div className="space-y-6">
          {/* Clock In / Clock Out Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider font-mono">Today's Shift Status</span>
              <h2 className="text-lg font-bold text-gray-900">
                {todayLog?.clockOut
                  ? 'Shift Completed'
                  : todayLog?.clockIn
                  ? 'Currently On Shift'
                  : 'Not Clocked In Today'}
              </h2>
              <p className="text-xs text-gray-500">
                {todayLog?.clockIn
                  ? `Clocked in at ${new Date(todayLog.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : 'Start your workday by clocking in.'}
                {todayLog?.clockOut && ` • Clocked out at ${new Date(todayLog.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${todayLog.hoursWorked} hrs)`}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {!todayLog?.clockIn && (
                <button
                  onClick={handleClockIn}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Clock In Now
                </button>
              )}

              {todayLog?.clockIn && !todayLog?.clockOut && (
                <button
                  onClick={handleClockOut}
                  className="flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-semibold text-xs shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
                >
                  <Square className="w-4 h-4 fill-current" />
                  Clock Out
                </button>
              )}

              {todayLog?.clockOut && (
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4" /> Shift Logged Today
                </div>
              )}
            </div>
          </div>

          {/* Personal History Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Attendance Logs (This Month)</h3>
            </div>
            {loading ? (
              <div className="p-8 text-center text-gray-400 text-xs">Loading logs...</div>
            ) : personalLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">No attendance logs found.</div>
            ) : (
              <div className="divide-y divide-gray-100 text-xs">
                <div className="grid grid-cols-5 px-6 py-3 bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <div>Date</div>
                  <div>Clock In</div>
                  <div>Clock Out</div>
                  <div>Hours Worked</div>
                  <div>Status</div>
                </div>
                {personalLogs.map((log) => (
                  <div key={log.id} className="grid grid-cols-5 px-6 py-3.5 items-center text-gray-700">
                    <div className="font-semibold text-gray-900 font-mono">
                      {new Date(log.date).toLocaleDateString()}
                    </div>
                    <div className="font-mono text-gray-600">
                      {log.clockIn ? new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </div>
                    <div className="font-mono text-gray-600">
                      {log.clockOut ? new Date(log.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </div>
                    <div className="font-mono font-bold text-indigo-600">
                      {log.hoursWorked ? `${log.hoursWorked} hrs` : '-'}
                    </div>
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                        {log.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Team Calendar Tab */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Direct Reports Presence Summary</h2>
          {teamCalendar?.team?.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-xs">No direct reports found.</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teamCalendar?.team?.map((member: any) => {
                  const logs = teamCalendar?.attendance?.filter((a: any) => a.employeeId === member.id) || [];
                  const lastLog = logs[logs.length - 1];

                  return (
                    <div key={member.id} className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                            {member.firstName[0]}{member.lastName[0]}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-gray-900">{member.firstName} {member.lastName}</h4>
                            <span className="text-[10px] text-gray-400 font-mono">{member.employeeId}</span>
                          </div>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          lastLog?.clockIn && !lastLog?.clockOut
                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {lastLog?.clockIn && !lastLog?.clockOut ? 'ACTIVE NOW' : 'OFF SHIFT'}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500 flex items-center justify-between pt-2 border-t border-gray-200/60">
                        <span>Logged Shifts This Month: <strong>{logs.length}</strong></span>
                        <span>Latest: <strong>{lastLog ? new Date(lastLog.date).toLocaleDateString() : 'None'}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
